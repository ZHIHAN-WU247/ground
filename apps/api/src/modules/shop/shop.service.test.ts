import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Product } from "@ground/shared";
import { ShopService } from "./shop.service";

type CreateProductInput = Omit<Product, "id" | "skus"> & {
  skus: Array<Omit<Product["skus"][number], "id">>;
};

interface ProductService {
  createProduct(input: CreateProductInput): Product;
  deleteProduct(id: string): Product;
  getAdminProduct(id: string): Product;
  getAdminOrder(id: string): ReturnType<ShopService["createOrder"]>;
  listAdminProducts(): Product[];
  listAdminOrders(): Array<ReturnType<ShopService["createOrder"]>>;
  listLogisticsHandoffs(): Array<ReturnType<ShopService["createOrder"]>>;
  linkOrderToLogistics(id: string, logisticsOrder: { id: string; orderNo: string }): ReturnType<ShopService["createOrder"]>;
  setProductPublished(id: string, isPublished: boolean): Product;
  updateOrderStatus(id: string, status: "CANCELLED" | "CONFIRMED"): ReturnType<ShopService["createOrder"]>;
  updateProduct(id: string, input: CreateProductInput): Product;
}

const productInput: CreateProductInput = {
  slug: "linen-weekender",
  name: "亚麻周末包",
  summary: "轻量、耐用的短途旅行包。",
  description: "适合两到三天行程的亚麻混纺旅行包。",
  imageUrl: "data:image/png;base64,cHJvZHVjdA==",
  galleryImageUrls: ["data:image/png;base64,Z2FsbGVyeQ=="],
  isPublished: true,
  categorySlug: "accessories",
  category: "配饰",
  skus: [{ model: "原色", size: "标准", price: 68, currency: "USD", stockLabel: "现货" }]
};

const run = () => {
  const directory = mkdtempSync(join(tmpdir(), "ground-products-"));
  const storePath = join(directory, "products.json");

  try {
    const ServiceConstructor = ShopService as unknown as new (path: string) => ShopService & ProductService;
    const service = new ServiceConstructor(storePath);
    const created = service.createProduct(productInput);

    assert.match(created.id, /^prod-/);
    assert.match(created.skus[0]?.id ?? "", /^sku-/);
    assert.equal(JSON.parse(readFileSync(storePath, "utf8")).some((product: Product) => product.slug === productInput.slug), true);

    const reloaded = new ServiceConstructor(storePath);
    assert.equal(reloaded.listProducts().some((product) => product.slug === productInput.slug), true);
    assert.throws(() => reloaded.createProduct(productInput), /slug already exists/i);

    const draft = reloaded.createProduct({ ...productInput, slug: "linen-weekender-draft", isPublished: false });
    assert.equal(reloaded.listProducts().some((product) => product.id === draft.id), false);
    assert.equal(reloaded.listAdminProducts().some((product) => product.id === draft.id), true);
    assert.throws(() => reloaded.getProduct(draft.slug), /not found/i);

    const updated = reloaded.updateProduct(created.id, {
      ...productInput,
      slug: "linen-weekender-updated",
      name: "Updated weekender",
      skus: [{ ...productInput.skus[0]!, price: 72 }]
    });
    assert.equal(updated.id, created.id);
    assert.equal(updated.name, "Updated weekender");
    assert.equal(updated.skus[0]?.price, 72);
    assert.match(updated.skus[0]?.id ?? "", /^sku-/);
    assert.equal(reloaded.getAdminProduct(created.id).slug, "linen-weekender-updated");
    assert.throws(() => reloaded.getProduct("linen-weekender"), /not found/i);
    assert.throws(
      () => reloaded.updateProduct(draft.id, { ...productInput, slug: "linen-weekender-updated" }),
      /slug already exists/i
    );

    const unpublished = reloaded.setProductPublished(created.id, false);
    assert.equal(unpublished.isPublished, false);
    assert.throws(() => reloaded.getProduct(updated.slug), /not found/i);
    assert.equal(reloaded.setProductPublished(created.id, true).isPublished, true);
    assert.equal(reloaded.getProduct(updated.slug).id, created.id);

    const orderInput = {
      items: [{ productId: updated.id, skuId: updated.skus[0]!.id, quantity: 2 }],
      recipient: {
        name: "Order recipient",
        phone: "+86 13800000000",
        email: "recipient@example.com",
        country: "China",
        province: "Guangdong",
        city: "Shenzhen",
        postalCode: "518000",
        addressLine: "Nanshan District"
      }
    };
    const order = reloaded.createOrder(orderInput);
    const orderItem = order.items[0] as (typeof order.items)[number] & {
      productImageUrl: string;
      productName: string;
      productSlug: string;
      skuModel: string;
      skuSize: string;
    };
    assert.equal(orderItem.productName, updated.name);
    assert.equal(orderItem.productSlug, updated.slug);
    assert.equal(orderItem.productImageUrl, updated.imageUrl);
    assert.equal(orderItem.skuModel, updated.skus[0]!.model);
    assert.equal(orderItem.skuSize, updated.skus[0]!.size);
    assert.equal(order.currency, updated.skus[0]!.currency);

    const orderReloaded = new ServiceConstructor(storePath);
    assert.equal(orderReloaded.listAdminOrders().some((item) => item.id === order.id), true);
    assert.equal(orderReloaded.getAdminOrder(order.orderNo).id, order.id);
    assert.equal(orderReloaded.updateOrderStatus(order.id, "CONFIRMED").status, "CONFIRMED");
    assert.equal(orderReloaded.listLogisticsHandoffs().some((item) => item.id === order.id), true);
    assert.throws(() => orderReloaded.updateOrderStatus(order.id, "CANCELLED"), /pending confirmation/i);
    const linkedOrder = orderReloaded.linkOrderToLogistics(order.id, {
      id: "log-shop-1",
      orderNo: "AC202607030001"
    });
    assert.equal(linkedOrder.status, "LINKED_TO_LOGISTICS");
    assert.equal(linkedOrder.logisticsOrderId, "log-shop-1");
    assert.equal(linkedOrder.logisticsReferenceNo, "AC202607030001");
    assert.equal(orderReloaded.listLogisticsHandoffs().some((item) => item.id === order.id), false);
    assert.throws(
      () => orderReloaded.linkOrderToLogistics(order.id, { id: "log-shop-2", orderNo: "AC202607030002" }),
      /already linked/i
    );

    const cancelledOrder = orderReloaded.createOrder(orderInput);
    assert.throws(
      () => orderReloaded.linkOrderToLogistics(cancelledOrder.id, { id: "log-shop-3", orderNo: "AC202607030003" }),
      /confirmed/i
    );
    assert.equal(orderReloaded.updateOrderStatus(cancelledOrder.id, "CANCELLED").status, "CANCELLED");
    assert.equal(orderReloaded.listLogisticsHandoffs().some((item) => item.id === cancelledOrder.id), false);
    const statusReloaded = new ServiceConstructor(storePath);
    assert.equal(statusReloaded.getAdminOrder(order.id).status, "LINKED_TO_LOGISTICS");
    assert.equal(statusReloaded.getAdminOrder(order.id).logisticsOrderId, "log-shop-1");
    assert.equal(statusReloaded.getAdminOrder(cancelledOrder.id).status, "CANCELLED");

    const deleted = reloaded.deleteProduct(draft.id);
    assert.equal(deleted.id, draft.id);
    assert.throws(() => reloaded.getAdminProduct(draft.id), /not found/i);
    const afterDeleteReload = new ServiceConstructor(storePath);
    assert.equal(afterDeleteReload.listAdminProducts().some((product) => product.id === draft.id), false);

    const blockedDirectory = join(directory, "not-a-directory");
    writeFileSync(blockedDirectory, "blocked", "utf8");
    const failingService = new ServiceConstructor(join(blockedDirectory, "products.json"));
    assert.throws(() => failingService.createProduct({ ...productInput, slug: "write-must-fail" }));
    assert.equal(failingService.listAdminProducts().some((product) => product.slug === "write-must-fail"), false);
    const seedProduct = failingService.listAdminProducts()[0]!;
    assert.throws(() => failingService.updateProduct(seedProduct.id, { ...productInput, slug: "write-update-must-fail" }));
    assert.equal(failingService.getAdminProduct(seedProduct.id).slug, seedProduct.slug);
    const seedSku = seedProduct.skus[0]!;
    assert.throws(() =>
      failingService.createOrder({
        ...orderInput,
        items: [{ productId: seedProduct.id, skuId: seedSku.id, quantity: 1 }]
      })
    );
    assert.equal(failingService.listAdminOrders().length, 0);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};

run();
