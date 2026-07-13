import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { CreateProductInput, Product, ShopOrder, ShopOrderStatus } from "@ground/shared";
import { sampleProducts } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseCustomerRiskGuard, type SupabaseCustomerRiskClient } from "../customer-risk/supabase-customer-risk-guard";
import type { CreateShopOrderDto } from "./dto/create-shop-order.dto";
import { SupabaseProductStore, type SupabaseProductClient } from "./supabase-product-store";
import { SupabaseShopOrderStore, type SupabaseShopOrderClient } from "./supabase-shop-order-store";

export const PRODUCT_STORE_PATH = "PRODUCT_STORE_PATH";

@Injectable()
export class ShopService {
  private readonly products: Product[];
  private readonly orders: ShopOrder[];
  private readonly orderStorePath: string;
  private readonly productStore?: SupabaseProductStore;
  private readonly shopOrderStore?: SupabaseShopOrderStore;
  private readonly customerRiskGuard?: SupabaseCustomerRiskGuard;

  constructor(
    @Optional() @Inject(PRODUCT_STORE_PATH) private readonly storePath = resolve(process.cwd(), "data/products.json"),
    @Optional() private readonly supabaseService?: SupabaseService
  ) {
    this.orderStorePath = join(dirname(this.storePath), "shop-orders.json");
    this.products = this.readProducts();
    this.orders = this.readOrders();

    if (this.supabaseService?.client) {
      this.productStore = new SupabaseProductStore(this.supabaseService.client as unknown as SupabaseProductClient);
      this.shopOrderStore = new SupabaseShopOrderStore(this.supabaseService.client as unknown as SupabaseShopOrderClient);
      this.customerRiskGuard = new SupabaseCustomerRiskGuard(this.supabaseService.client as unknown as SupabaseCustomerRiskClient);
    }
  }

  async listProducts(): Promise<Product[]> {
    if (this.productStore) {
      return this.productStore.listPublishedProducts();
    }

    return this.products.filter((product) => product.isPublished);
  }

  async listAdminProducts(): Promise<Product[]> {
    if (this.productStore) {
      return this.productStore.listAdminProducts();
    }

    return this.products;
  }

  async getAdminProduct(identifier: string): Promise<Product> {
    if (this.productStore) {
      return this.getSupabaseProduct(identifier);
    }

    const product = this.products.find((item) => item.id === identifier || item.slug === identifier);

    if (!product) {
      throw new NotFoundException("Product was not found.");
    }

    return product;
  }

  async getProduct(slug: string): Promise<Product> {
    if (this.productStore) {
      return this.getSupabaseProduct(slug, { publishedOnly: true });
    }

    const product = this.products.filter((item) => item.isPublished).find((item) => item.slug === slug || item.id === slug);

    if (!product) {
      throw new NotFoundException("Product was not found.");
    }

    return product;
  }

  async createProduct(input: CreateProductInput): Promise<Product> {
    if (await this.hasProductSlug(input.slug)) {
      throw new ConflictException("Product slug already exists.");
    }

    if (this.productStore) {
      return this.productStore.createProduct(input);
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

  async updateProduct(identifier: string, input: CreateProductInput): Promise<Product> {
    if (this.productStore) {
      const current = await this.getSupabaseProduct(identifier);
      const duplicateId = await this.productStore.findProductBySlug(input.slug);

      if (duplicateId && duplicateId !== current.id) {
        throw new ConflictException("Product slug already exists.");
      }

      return this.productStore.updateProduct(current.id, input);
    }

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

  async setProductPublished(identifier: string, isPublished: boolean): Promise<Product> {
    if (this.productStore) {
      return this.productStore.setProductPublished(identifier, isPublished);
    }

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

  async deleteProduct(identifier: string): Promise<Product> {
    if (this.productStore) {
      return this.productStore.deleteProduct(identifier);
    }

    const index = this.findProductIndex(identifier);
    const deleted = this.products[index]!;
    const products = this.products.filter((_, productIndex) => productIndex !== index);
    this.persistProducts(products);
    this.products.splice(index, 1);
    return deleted;
  }

  async listOrders(ownerEmail?: string): Promise<ShopOrder[]> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.listOrders(ownerEmail);
    }

    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwnerEmail) {
      return [];
    }

    return this.orders.filter((order) => order.ownerEmail === normalizedOwnerEmail);
  }

  async listAdminOrders(): Promise<ShopOrder[]> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.listAdminOrders();
    }

    return this.orders;
  }

  async getOrder(identifier: string, ownerEmail?: string): Promise<ShopOrder> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.getOrder(identifier, ownerEmail);
    }

    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);
    const order = normalizedOwnerEmail
      ? this.orders.find((item) => (item.id === identifier || item.orderNo === identifier) && item.ownerEmail === normalizedOwnerEmail)
      : undefined;

    if (!order) {
      throw new NotFoundException("Shop order was not found.");
    }

    return order;
  }

  async listLogisticsHandoffs(): Promise<ShopOrder[]> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.listLogisticsHandoffs();
    }

    return this.orders.filter((order) => order.status === "CONFIRMED");
  }

  async getAdminOrder(identifier: string): Promise<ShopOrder> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.getAdminOrder(identifier);
    }

    const order = this.orders.find((item) => item.id === identifier || item.orderNo === identifier);

    if (!order) {
      throw new NotFoundException("Shop order was not found.");
    }

    return order;
  }

  async createOrder(input: CreateShopOrderDto): Promise<ShopOrder> {
    const products = await this.listProducts();
    const items = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
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
    const ownerEmail = this.normalizeOwnerEmail(input.ownerEmail);
    await this.customerRiskGuard?.assertCanCreateOrder(ownerEmail);
    const orderNo = await this.generateShopOrderNo();

    if (this.shopOrderStore) {
      return this.shopOrderStore.createOrder({
        orderNo,
        ...(ownerEmail ? { ownerEmail } : {}),
        status: "PENDING_CONFIRMATION",
        items,
        recipient: input.recipient,
        totalAmount,
        currency: items[0]!.currency
      });
    }

    const order: ShopOrder = {
      id: `shop-${randomUUID()}`,
      orderNo,
      ...(ownerEmail ? { ownerEmail } : {}),
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

  private async hasProductSlug(slug: string) {
    if (this.productStore) {
      return Boolean(await this.productStore.findProductBySlug(slug));
    }

    return this.products.some((product) => product.slug.toLowerCase() === slug.toLowerCase());
  }

  private async getSupabaseProduct(identifier: string, options: { publishedOnly?: boolean } = {}) {
    try {
      return await this.productStore!.getProduct(identifier, options);
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        throw new NotFoundException("Product was not found.");
      }

      throw error;
    }
  }

  async updateOrderStatus(identifier: string, status: Extract<ShopOrderStatus, "CONFIRMED" | "CANCELLED">): Promise<ShopOrder> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.updateOrderStatus(identifier, status);
    }

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

  async linkOrderToLogistics(identifier: string, logisticsOrder: { id: string; orderNo: string }): Promise<ShopOrder> {
    if (this.shopOrderStore) {
      return this.shopOrderStore.linkOrderToLogistics(identifier, logisticsOrder);
    }

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

  private async generateShopOrderNo() {
    const count = this.shopOrderStore ? (await this.shopOrderStore.listAdminOrders()).length : this.orders.length;
    return `SH${new Date().getFullYear()}${String(count + 1).padStart(8, "0")}`;
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

  private normalizeOwnerEmail(ownerEmail?: string) {
    return ownerEmail?.trim().toLowerCase() || undefined;
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
