import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CreateProductInput, LogisticsOrder } from "@ground/shared";
import type { LogisticsService } from "../logistics/logistics.service";
import type { CreateShopLogisticsOrderDto } from "./dto/create-shop-logistics-order.dto";
import { ShopOrderLogisticsBridgeService } from "./shop-order-logistics-bridge.service";
import { ShopService } from "./shop.service";

const productInput: CreateProductInput = {
  slug: "bridge-product",
  name: "Bridge product",
  summary: "Order bridge test",
  description: "Order bridge test product",
  imageUrl: "data:image/png;base64,cHJvZHVjdA==",
  galleryImageUrls: [],
  isPublished: true,
  categorySlug: "daily",
  category: "Daily",
  skus: [{ model: "Standard", size: "M", price: 50, currency: "USD", stockLabel: "In stock" }]
};

const logisticsInput: CreateShopLogisticsOrderDto = {
  routeId: "air-cdek",
  sender: {
    name: "Ground warehouse",
    phone: "+86 755 1000 2000",
    email: "warehouse@ground.test",
    country: "China",
    province: "Guangdong",
    city: "Shenzhen",
    postalCode: "518000",
    addressLine: "Warehouse Road 1"
  },
  itemDeclaredValues: [],
  taxIdOrDocumentNo: "RU-DOC-1",
  weightKg: 2,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
  packageCount: 1
};

class FakeLogisticsService {
  readonly createdInputs: unknown[] = [];
  readonly orders: LogisticsOrder[] = [];
  shouldFail = false;

  async createOrder(input: Parameters<LogisticsService["createOrder"]>[0]) {
    if (this.shouldFail) {
      throw new Error("Logistics creation failed");
    }

    this.createdInputs.push(input);
    const order = {
      id: `log-bridge-${this.orders.length + 1}`,
      orderNo: `AC-BRIDGE-${this.orders.length + 1}`
    } as LogisticsOrder;
    this.orders.push(order);
    return order;
  }

  discardOrder(id: string) {
    const index = this.orders.findIndex((order) => order.id === id);
    if (index >= 0) this.orders.splice(index, 1);
  }
}

const run = async () => {
  const directory = mkdtempSync(join(tmpdir(), "ground-shop-bridge-"));
  const storePath = join(directory, "products.json");

  try {
    const shopService = new (ShopService as unknown as new (path: string) => ShopService)(storePath);
    const product = shopService.createProduct(productInput);
    const order = shopService.createOrder({
      items: [{ productId: product.id, skuId: product.skus[0]!.id, quantity: 2 }],
      recipient: {
        name: "Ivan Petrov",
        phone: "+7 900 000 2200",
        email: "ivan@example.com",
        country: "Russia",
        province: "Moscow",
        city: "Moscow",
        postalCode: "101000",
        addressLine: "Tverskaya Street 8"
      }
    });
    const fakeLogistics = new FakeLogisticsService();
    const bridge = new ShopOrderLogisticsBridgeService(
      shopService,
      fakeLogistics as unknown as LogisticsService
    );
    const input = {
      ...logisticsInput,
      itemDeclaredValues: [{
        productId: product.id,
        skuId: product.skus[0]!.id,
        unitValueCny: 88
      }]
    };

    await assert.rejects(() => bridge.submit(order.id, input), /confirmed/i);
    shopService.updateOrderStatus(order.id, "CONFIRMED");
    await assert.rejects(
      () => bridge.submit(order.id, { ...input, taxIdOrDocumentNo: "" }),
      /tax or document/i
    );
    assert.equal(shopService.getAdminOrder(order.id).status, "CONFIRMED");
    assert.equal(fakeLogistics.orders.length, 0);

    const result = await bridge.submit(order.id, input);
    const createdInput = fakeLogistics.createdInputs[0] as Parameters<LogisticsService["createOrder"]>[0];
    assert.equal(createdInput.cargoType, "B2C");
    assert.deepEqual(createdInput.recipient, order.recipient);
    assert.deepEqual(createdInput.cargoItems, [{
      name: `${product.name} / ${product.skus[0]!.model} / ${product.skus[0]!.size}`,
      unitValueCny: 88,
      quantity: 2
    }]);
    assert.equal(result.shopOrder.status, "LINKED_TO_LOGISTICS");
    assert.equal(result.shopOrder.logisticsOrderId, result.logisticsOrder.id);
    assert.equal(result.shopOrder.logisticsReferenceNo, result.logisticsOrder.orderNo);
    await assert.rejects(() => bridge.submit(order.id, input), /already linked/i);
    assert.equal(fakeLogistics.orders.length, 1);

    const failedOrder = shopService.createOrder({
      items: [{ productId: product.id, skuId: product.skus[0]!.id, quantity: 1 }],
      recipient: {
        ...order.recipient,
        email: order.recipient.email ?? ""
      }
    });
    shopService.updateOrderStatus(failedOrder.id, "CONFIRMED");
    fakeLogistics.shouldFail = true;
    await assert.rejects(() => bridge.submit(failedOrder.id, input), /creation failed/i);
    assert.equal(shopService.getAdminOrder(failedOrder.id).status, "CONFIRMED");
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};

void run();
