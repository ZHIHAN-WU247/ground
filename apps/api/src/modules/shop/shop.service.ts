import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { CreateProductInput, Product, ShopOrder, ShopOrderStatus } from "@ground/shared";
import { sampleProducts } from "@ground/shared";
import type { CreateShopOrderDto } from "./dto/create-shop-order.dto";

export const PRODUCT_STORE_PATH = "PRODUCT_STORE_PATH";

@Injectable()
export class ShopService {
  private readonly products: Product[];
  private readonly orders: ShopOrder[];
  private readonly orderStorePath: string;

  constructor(@Optional() @Inject(PRODUCT_STORE_PATH) private readonly storePath = resolve(process.cwd(), "data/products.json")) {
    this.orderStorePath = join(dirname(this.storePath), "shop-orders.json");
    this.products = this.readProducts();
    this.orders = this.readOrders();
  }

  listProducts(): Product[] {
    return this.products.filter((product) => product.isPublished);
  }

  listAdminProducts(): Product[] {
    return this.products;
  }

  getAdminProduct(identifier: string): Product {
    const product = this.products.find((item) => item.id === identifier || item.slug === identifier);

    if (!product) {
      throw new NotFoundException("Product was not found.");
    }

    return product;
  }

  getProduct(slug: string): Product {
    const product = this.listProducts().find((item) => item.slug === slug || item.id === slug);

    if (!product) {
      throw new NotFoundException("Product was not found.");
    }

    return product;
  }

  createProduct(input: CreateProductInput): Product {
    if (this.products.some((product) => product.slug.toLowerCase() === input.slug.toLowerCase())) {
      throw new ConflictException("Product slug already exists.");
    }

    const product: Product = {
      ...input,
      id: `prod-${randomUUID()}`,
      skus: input.skus.map((sku) => ({
        ...sku,
        id: `sku-${randomUUID()}`
      }))
    };

    this.persistProducts([product, ...this.products]);
    this.products.unshift(product);
    return product;
  }

  updateProduct(identifier: string, input: CreateProductInput): Product {
    const index = this.findProductIndex(identifier);
    const current = this.products[index]!;

    if (this.products.some((product, productIndex) => productIndex !== index && product.slug.toLowerCase() === input.slug.toLowerCase())) {
      throw new ConflictException("Product slug already exists.");
    }

    const updated: Product = {
      ...input,
      id: current.id,
      skus: input.skus.map((sku) => ({
        ...sku,
        id: `sku-${randomUUID()}`
      }))
    };
    const products = [...this.products];
    products[index] = updated;
    this.persistProducts(products);
    this.products[index] = updated;
    return updated;
  }

  setProductPublished(identifier: string, isPublished: boolean): Product {
    const index = this.findProductIndex(identifier);
    const updated: Product = {
      ...this.products[index]!,
      isPublished
    };
    const products = [...this.products];
    products[index] = updated;
    this.persistProducts(products);
    this.products[index] = updated;
    return updated;
  }

  deleteProduct(identifier: string): Product {
    const index = this.findProductIndex(identifier);
    const deleted = this.products[index]!;
    const products = this.products.filter((_, productIndex) => productIndex !== index);
    this.persistProducts(products);
    this.products.splice(index, 1);
    return deleted;
  }

  listOrders(): ShopOrder[] {
    return this.orders;
  }

  listAdminOrders(): ShopOrder[] {
    return this.orders;
  }

  listLogisticsHandoffs(): ShopOrder[] {
    return this.orders.filter((order) => order.status === "CONFIRMED");
  }

  getAdminOrder(identifier: string): ShopOrder {
    const order = this.orders.find((item) => item.id === identifier || item.orderNo === identifier);

    if (!order) {
      throw new NotFoundException("Shop order was not found.");
    }

    return order;
  }

  createOrder(input: CreateShopOrderDto): ShopOrder {
    const items = input.items.map((item) => {
      const product = this.products.find((candidate) => candidate.id === item.productId && candidate.isPublished);
      const sku = product?.skus.find((candidate) => candidate.id === item.skuId);

      if (!product || !sku) {
        throw new NotFoundException("Product SKU was not found.");
      }

      return {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImageUrl: product.imageUrl,
        skuId: sku.id,
        skuModel: sku.model,
        skuSize: sku.size,
        quantity: item.quantity,
        unitPrice: sku.price,
        currency: sku.currency
      };
    });

    const currencies = new Set(items.map((item) => item.currency));

    if (currencies.size !== 1) {
      throw new BadRequestException("Shop orders cannot contain mixed currencies.");
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const order: ShopOrder = {
      id: `shop-${randomUUID()}`,
      orderNo: `SH${new Date().getFullYear()}${String(this.orders.length + 1).padStart(8, "0")}`,
      status: "PENDING_CONFIRMATION",
      items: items.map(({ currency: _currency, ...item }) => item),
      recipient: input.recipient,
      totalAmount,
      currency: items[0]!.currency,
      createdAt: new Date().toISOString()
    };

    this.persistOrders([order, ...this.orders]);
    this.orders.unshift(order);
    return order;
  }

  updateOrderStatus(identifier: string, status: Extract<ShopOrderStatus, "CONFIRMED" | "CANCELLED">): ShopOrder {
    const index = this.orders.findIndex((order) => order.id === identifier || order.orderNo === identifier);

    if (index === -1) {
      throw new NotFoundException("Shop order was not found.");
    }

    const current = this.orders[index]!;

    if (current.status !== "PENDING_CONFIRMATION") {
      throw new BadRequestException("Only orders pending confirmation can be updated.");
    }

    const updated: ShopOrder = { ...current, status };
    const orders = [...this.orders];
    orders[index] = updated;
    this.persistOrders(orders);
    this.orders[index] = updated;
    return updated;
  }

  linkOrderToLogistics(identifier: string, logisticsOrder: { id: string; orderNo: string }): ShopOrder {
    const index = this.orders.findIndex((order) => order.id === identifier || order.orderNo === identifier);

    if (index === -1) {
      throw new NotFoundException("Shop order was not found.");
    }

    const current = this.orders[index]!;

    if (current.status === "LINKED_TO_LOGISTICS") {
      throw new ConflictException("Shop order is already linked to a logistics order.");
    }

    if (current.status !== "CONFIRMED") {
      throw new BadRequestException("Only confirmed shop orders can be submitted to logistics.");
    }

    const updated: ShopOrder = {
      ...current,
      status: "LINKED_TO_LOGISTICS",
      logisticsOrderId: logisticsOrder.id,
      logisticsReferenceNo: logisticsOrder.orderNo
    };
    const orders = [...this.orders];
    orders[index] = updated;
    this.persistOrders(orders);
    this.orders[index] = updated;
    return updated;
  }

  private readProducts(): Product[] {
    if (!existsSync(this.storePath)) {
      return structuredClone(sampleProducts);
    }

    return JSON.parse(readFileSync(this.storePath, "utf8")) as Product[];
  }

  private readOrders(): ShopOrder[] {
    if (!existsSync(this.orderStorePath)) {
      return [];
    }

    return JSON.parse(readFileSync(this.orderStorePath, "utf8")) as ShopOrder[];
  }

  private findProductIndex(identifier: string) {
    const index = this.products.findIndex((product) => product.id === identifier || product.slug === identifier);

    if (index === -1) {
      throw new NotFoundException("Product was not found.");
    }

    return index;
  }

  private persistProducts(products: Product[]) {
    mkdirSync(dirname(this.storePath), { recursive: true });
    const temporaryPath = `${this.storePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(products, null, 2), "utf8");
    renameSync(temporaryPath, this.storePath);
  }

  private persistOrders(orders: ShopOrder[]) {
    mkdirSync(dirname(this.orderStorePath), { recursive: true });
    const temporaryPath = `${this.orderStorePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(orders, null, 2), "utf8");
    renameSync(temporaryPath, this.orderStorePath);
  }
}
