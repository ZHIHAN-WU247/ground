import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { AddressContact, ShopOrder, ShopOrderItem, ShopOrderStatus } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean; foreignTable?: string }): SupabaseQuery<T>;
  eq(column: string, value: string | boolean): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  delete(): SupabaseQuery<T>;
}

export interface SupabaseShopOrderClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

type OrderItemWithCurrency = ShopOrderItem & { currency: ShopOrder["currency"] };

export type CreateSupabaseShopOrderInput = Omit<ShopOrder, "id" | "createdAt" | "items"> & {
  items: OrderItemWithCurrency[];
};

interface ShopOrderItemRow {
  id: string;
  shop_order_id: string;
  product_id: string | null;
  sku_id: string | null;
  product_name: string;
  product_slug: string;
  product_image_url: string;
  sku_model: string;
  sku_size: string;
  quantity: number;
  unit_price: number | string;
  currency: ShopOrder["currency"];
  metadata: unknown;
}

interface ShopOrderRow {
  id: string;
  user_id: string | null;
  owner_email: string | null;
  order_no: string;
  status: ShopOrderStatus;
  recipient: unknown;
  total_amount: number | string;
  currency: ShopOrder["currency"];
  logistics_order_id: string | null;
  logistics_reference_no: string | null;
  metadata: unknown;
  created_at: string;
  shop_order_items?: ShopOrderItemRow[];
}

export class SupabaseShopOrderStore {
  constructor(private readonly client: SupabaseShopOrderClient) {}

  async listOrders(ownerEmail?: string): Promise<ShopOrder[]> {
    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwnerEmail) {
      return [];
    }

    const result = await this.baseOrderQuery<ShopOrderRow[]>()
      .eq("owner_email", normalizedOwnerEmail)
      .order("created_at", { ascending: false });
    this.assertSuccess(result, "Failed to load shop orders from Supabase.");
    return (result.data ?? []).map((row) => this.toShopOrder(row));
  }

  async listAdminOrders(): Promise<ShopOrder[]> {
    const result = await this.baseOrderQuery<ShopOrderRow[]>().order("created_at", { ascending: false });
    this.assertSuccess(result, "Failed to load admin shop orders from Supabase.");
    return (result.data ?? []).map((row) => this.toShopOrder(row));
  }

  async listLogisticsHandoffs(): Promise<ShopOrder[]> {
    const result = await this.baseOrderQuery<ShopOrderRow[]>()
      .eq("status", "CONFIRMED")
      .order("created_at", { ascending: false });
    this.assertSuccess(result, "Failed to load shop logistics handoffs from Supabase.");
    return (result.data ?? []).map((row) => this.toShopOrder(row));
  }

  async getOrder(identifier: string, ownerEmail?: string): Promise<ShopOrder> {
    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwnerEmail) {
      throw new NotFoundException("Shop order was not found.");
    }

    const order = await this.getOrderByIdentifier(identifier);

    if (order.ownerEmail !== normalizedOwnerEmail) {
      throw new NotFoundException("Shop order was not found.");
    }

    return order;
  }

  async getAdminOrder(identifier: string): Promise<ShopOrder> {
    return this.getOrderByIdentifier(identifier);
  }

  async createOrder(input: CreateSupabaseShopOrderInput): Promise<ShopOrder> {
    const orderResult = await this.client
      .from<ShopOrderRow>("shop_orders")
      .insert({
        order_no: input.orderNo,
        owner_email: this.normalizeOwnerEmail(input.ownerEmail),
        status: input.status,
        recipient: input.recipient,
        total_amount: input.totalAmount,
        currency: input.currency,
        metadata: {}
      })
      .select()
      .single();
    this.assertSuccess(orderResult, "Failed to create shop order in Supabase.");

    const itemResult = await this.client.from<ShopOrderItemRow[]>("shop_order_items").insert(
      input.items.map((item) => ({
        shop_order_id: orderResult.data!.id,
        product_id: this.uuidOrNull(item.productId),
        sku_id: this.uuidOrNull(item.skuId),
        product_name: item.productName,
        product_slug: item.productSlug,
        product_image_url: item.productImageUrl,
        sku_model: item.skuModel,
        sku_size: item.skuSize,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency: item.currency,
        metadata: {
          product_id: item.productId,
          sku_id: item.skuId
        }
      }))
    );
    this.assertSuccess(itemResult, "Failed to create shop order items in Supabase.");

    return this.getAdminOrder(orderResult.data!.id);
  }

  async updateOrderStatus(identifier: string, status: Extract<ShopOrderStatus, "CONFIRMED" | "CANCELLED">): Promise<ShopOrder> {
    const current = await this.getAdminOrder(identifier);

    if (current.status !== "PENDING_CONFIRMATION") {
      throw new BadRequestException("Only orders pending confirmation can be updated.");
    }

    const result = await this.client.from<ShopOrderRow>("shop_orders").update({ status }).eq("id", current.id).select().single();
    this.assertSuccess(result, "Failed to update shop order status in Supabase.");
    return this.getAdminOrder(current.id);
  }

  async linkOrderToLogistics(identifier: string, logisticsOrder: { id: string; orderNo: string }): Promise<ShopOrder> {
    const current = await this.getAdminOrder(identifier);

    if (current.status === "LINKED_TO_LOGISTICS") {
      throw new ConflictException("Shop order is already linked to a logistics order.");
    }

    if (current.status !== "CONFIRMED") {
      throw new BadRequestException("Only confirmed shop orders can be submitted to logistics.");
    }

    const metadata = {
      ...this.asRecord((await this.getRawOrder(current.id)).metadata),
      logistics_order_id: logisticsOrder.id
    };
    const result = await this.client
      .from<ShopOrderRow>("shop_orders")
      .update({
        status: "LINKED_TO_LOGISTICS",
        logistics_order_id: this.uuidOrNull(logisticsOrder.id),
        logistics_reference_no: logisticsOrder.orderNo,
        metadata
      })
      .eq("id", current.id)
      .select()
      .single();
    this.assertSuccess(result, "Failed to link shop order to logistics in Supabase.");
    return this.getAdminOrder(current.id);
  }

  private baseOrderQuery<T>() {
    return this.client
      .from<T>("shop_orders")
      .select("*, shop_order_items(*)")
      .order("created_at", { ascending: false })
      .order("created_at", { foreignTable: "shop_order_items", ascending: true });
  }

  private async getOrderByIdentifier(identifier: string) {
    const row = await this.getRawOrder(identifier);
    return this.toShopOrder(row);
  }

  private async getRawOrder(identifier: string) {
    let query = this.baseOrderQuery<ShopOrderRow>().limit(1);
    query = this.isUuid(identifier) ? query.eq("id", identifier) : query.eq("order_no", identifier);
    const result = await query.maybeSingle();
    this.assertSuccess(result, "Failed to load shop order from Supabase.");

    if (!result.data) {
      throw new NotFoundException("Shop order was not found.");
    }

    return result.data;
  }

  private toShopOrder(row: ShopOrderRow): ShopOrder {
    const metadata = this.asRecord(row.metadata);
    const logisticsOrderId = row.logistics_order_id ?? this.asOptionalString(metadata.logistics_order_id);

    return {
      id: row.id,
      orderNo: row.order_no,
      ...(row.owner_email ? { ownerEmail: row.owner_email } : {}),
      status: row.status,
      items: (row.shop_order_items ?? []).map((item) => ({
        productId: this.asOptionalString(this.asRecord(item.metadata).product_id) ?? item.product_id ?? "",
        productName: item.product_name,
        productSlug: item.product_slug,
        productImageUrl: item.product_image_url,
        skuId: this.asOptionalString(this.asRecord(item.metadata).sku_id) ?? item.sku_id ?? "",
        skuModel: item.sku_model,
        skuSize: item.sku_size,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price)
      })),
      recipient: this.toRecipient(row.recipient),
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      ...(logisticsOrderId ? { logisticsOrderId } : {}),
      ...(row.logistics_reference_no ? { logisticsReferenceNo: row.logistics_reference_no } : {}),
      createdAt: row.created_at
    };
  }

  private toRecipient(value: unknown): AddressContact {
    const record = this.asRecord(value);
    return {
      name: this.asString(record.name),
      phone: this.asString(record.phone),
      email: this.asString(record.email),
      country: this.asString(record.country),
      province: this.asString(record.province),
      city: this.asString(record.city),
      postalCode: this.asString(record.postalCode),
      addressLine: this.asString(record.addressLine),
      ...(this.asOptionalString(record.locationCode) ? { locationCode: this.asString(record.locationCode) } : {}),
      ...(this.asOptionalString(record.fiasGuid) ? { fiasGuid: this.asString(record.fiasGuid) } : {})
    };
  }

  private normalizeOwnerEmail(ownerEmail?: string) {
    return ownerEmail?.trim().toLowerCase() || undefined;
  }

  private uuidOrNull(value: string) {
    return this.isUuid(value) ? value : null;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private asOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value : undefined;
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }
}
