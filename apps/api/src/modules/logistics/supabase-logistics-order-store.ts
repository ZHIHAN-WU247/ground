import { NotFoundException } from "@nestjs/common";
import type {
  AddressContact,
  CargoItem,
  LogisticsOrder,
  LogisticsQuoteSnapshot,
  LogisticsStatus,
  TrackingEvent
} from "@ground/shared";

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

export interface SupabaseLogisticsOrderClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface LogisticsEventRow {
  id: string;
  logistics_order_id: string;
  status: LogisticsStatus;
  title: string;
  description: string;
  location: string | null;
  occurred_at: string;
  source: TrackingEvent["source"];
  raw_payload: unknown;
  created_at: string;
}

interface LogisticsOrderRow {
  id: string;
  owner_email: string | null;
  order_no: string;
  cargo_type: LogisticsOrder["cargoType"];
  route_id: LogisticsOrder["routeId"] | null;
  delivery_method: LogisticsOrder["deliveryMethod"];
  status: LogisticsOrder["status"];
  review_state: LogisticsOrder["reviewState"];
  sender: unknown;
  recipient: unknown;
  cargo_items: unknown;
  goods_name: string;
  declared_value: number | string;
  declared_currency: LogisticsOrder["declaredCurrency"];
  tax_id_or_document_no: string;
  weight_kg: number | string;
  length_cm: number | string;
  width_cm: number | string;
  height_cm: number | string;
  package_count: number;
  cdek_tariff_code: number | null;
  tracking_no: string | null;
  tracking_source: LogisticsOrder["trackingSource"] | null;
  carrier_name: string | null;
  carrier_reference_no: string | null;
  carrier_create_state: LogisticsOrder["carrierCreateState"];
  carrier_entity_uuid: string | null;
  carrier_request_uuid: string | null;
  carrier_raw_status: string | null;
  carrier_last_error: string | null;
  label_uuid: string | null;
  label_status: LogisticsOrder["labelStatus"];
  label_url: string | null;
  label_last_error: string | null;
  tracking_sync_status: LogisticsOrder["trackingSyncStatus"];
  tracking_synced_at: string | null;
  review_failure_reason: string | null;
  last_mile_tracking_no: string | null;
  estimated_quote: unknown;
  metadata: unknown;
  created_at: string;
  logistics_tracking_events?: LogisticsEventRow[];
}

export class SupabaseLogisticsOrderStore {
  constructor(private readonly client: SupabaseLogisticsOrderClient) {}

  async listOrders(ownerEmail?: string): Promise<LogisticsOrder[]> {
    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwnerEmail) {
      return [];
    }

    const result = await this.baseOrderQuery<LogisticsOrderRow[]>()
      .eq("owner_email", normalizedOwnerEmail)
      .order("created_at", { ascending: false });
    this.assertSuccess(result, "Failed to load logistics orders from Supabase.");
    return (result.data ?? []).map((row) => this.toOrder(row));
  }

  async listAdminOrders(): Promise<LogisticsOrder[]> {
    const result = await this.baseOrderQuery<LogisticsOrderRow[]>().order("created_at", { ascending: false });
    this.assertSuccess(result, "Failed to load admin logistics orders from Supabase.");
    return (result.data ?? []).map((row) => this.toOrder(row));
  }

  async getOrder(identifier: string, ownerEmail?: string): Promise<LogisticsOrder> {
    const row = await this.getRawOrder(identifier);
    const order = this.toOrder(row);
    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (normalizedOwnerEmail && order.ownerEmail !== normalizedOwnerEmail) {
      throw new NotFoundException("Logistics order was not found.");
    }

    return order;
  }

  async createOrder(order: LogisticsOrder): Promise<LogisticsOrder> {
    const result = await this.client.from<LogisticsOrderRow>("logistics_orders").insert(this.toOrderPayload(order)).select().single();
    this.assertSuccess(result, "Failed to create logistics order in Supabase.");
    await this.replaceEvents(result.data!.id, order.events);
    return this.getOrder(result.data!.id);
  }

  async saveOrder(order: LogisticsOrder): Promise<LogisticsOrder> {
    const result = await this.client.from<LogisticsOrderRow>("logistics_orders").update(this.toOrderPayload(order)).eq("id", order.id).select().single();
    this.assertSuccess(result, "Failed to update logistics order in Supabase.");
    await this.replaceEvents(order.id, order.events);
    return this.getOrder(order.id);
  }

  async deleteOrder(identifier: string): Promise<void> {
    const current = await this.getOrder(identifier);
    const result = await this.client.from<LogisticsOrderRow>("logistics_orders").delete().eq("id", current.id);
    this.assertSuccess(result, "Failed to delete logistics order from Supabase.");
  }

  private baseOrderQuery<T>() {
    return this.client
      .from<T>("logistics_orders")
      .select("*, logistics_tracking_events(*)")
      .order("created_at", { ascending: false })
      .order("occurred_at", { foreignTable: "logistics_tracking_events", ascending: false });
  }

  private async getRawOrder(identifier: string) {
    const byIdOrOrderNo = await this.queryOne(identifier, this.isUuid(identifier) ? "id" : "order_no");

    if (byIdOrOrderNo) {
      return byIdOrOrderNo;
    }

    const byTrackingNo = await this.queryOne(identifier, "tracking_no");

    if (byTrackingNo) {
      return byTrackingNo;
    }

    throw new NotFoundException("Logistics order was not found.");
  }

  private async queryOne(identifier: string, column: "id" | "order_no" | "tracking_no") {
    const result = await this.baseOrderQuery<LogisticsOrderRow>().eq(column, identifier).limit(1).maybeSingle();
    this.assertSuccess(result, "Failed to load logistics order from Supabase.");
    return result.data;
  }

  private async replaceEvents(orderId: string, events: TrackingEvent[]) {
    const deleteResult = await this.client.from<LogisticsEventRow[]>("logistics_tracking_events").delete().eq("logistics_order_id", orderId);
    this.assertSuccess(deleteResult, "Failed to replace logistics events in Supabase.");

    if (events.length === 0) {
      return;
    }

    const insertResult = await this.client.from<LogisticsEventRow[]>("logistics_tracking_events").insert(
      events.map((event) => ({
        logistics_order_id: orderId,
        status: event.status,
        title: event.title,
        description: event.description,
        location: event.location,
        occurred_at: event.occurredAt,
        source: event.source,
        raw_payload: { original_id: event.id }
      }))
    );
    this.assertSuccess(insertResult, "Failed to create logistics events in Supabase.");
  }

  private toOrderPayload(order: LogisticsOrder) {
    return {
      owner_email: this.normalizeOwnerEmail(order.ownerEmail) ?? null,
      order_no: order.orderNo,
      cargo_type: order.cargoType,
      route_id: order.routeId ?? "air-cdek",
      delivery_method: order.deliveryMethod,
      status: order.status,
      review_state: order.reviewState,
      sender: order.sender,
      recipient: order.recipient,
      cargo_items: order.cargoItems ?? [],
      goods_name: order.goodsName,
      declared_value: order.declaredValue,
      declared_currency: order.declaredCurrency,
      tax_id_or_document_no: order.taxIdOrDocumentNo,
      weight_kg: order.weightKg,
      length_cm: order.lengthCm,
      width_cm: order.widthCm,
      height_cm: order.heightCm,
      package_count: order.packageCount,
      cdek_tariff_code: order.cdekTariffCode ?? null,
      tracking_no: order.trackingNo ?? null,
      tracking_source: order.trackingSource ?? null,
      carrier_name: order.carrierName ?? null,
      carrier_reference_no: order.carrierReferenceNo ?? null,
      carrier_create_state: order.carrierCreateState ?? "NOT_SUBMITTED",
      carrier_entity_uuid: order.carrierEntityUuid ?? null,
      carrier_request_uuid: order.carrierRequestUuid ?? null,
      carrier_raw_status: order.carrierRawStatus ?? null,
      carrier_last_error: order.carrierLastError ?? null,
      label_uuid: order.labelUuid ?? null,
      label_status: order.labelStatus ?? "NOT_REQUESTED",
      label_url: order.labelUrl ?? null,
      label_last_error: order.labelLastError ?? null,
      tracking_sync_status: order.trackingSyncStatus ?? "NOT_STARTED",
      tracking_synced_at: order.trackingSyncedAt ?? null,
      review_failure_reason: order.reviewFailureReason ?? null,
      last_mile_tracking_no: order.lastMileTrackingNo ?? null,
      estimated_quote: order.estimatedQuote ?? null,
      metadata: {
        original_id: this.isUuid(order.id) ? undefined : order.id
      }
    };
  }

  private toOrder(row: LogisticsOrderRow): LogisticsOrder {
    const metadata = this.asRecord(row.metadata);
    const cargoItems = this.toCargoItems(row.cargo_items);
    const estimatedQuote = this.toQuote(row.estimated_quote);
    return {
      id: row.id,
      orderNo: row.order_no,
      ...(row.owner_email ? { ownerEmail: row.owner_email } : {}),
      cargoType: row.cargo_type,
      ...(row.route_id ? { routeId: row.route_id } : {}),
      deliveryMethod: row.delivery_method,
      status: row.status,
      reviewState: row.review_state,
      ...(row.carrier_name ? { carrierName: row.carrier_name } : {}),
      ...(row.carrier_create_state ? { carrierCreateState: row.carrier_create_state } : {}),
      ...(row.carrier_entity_uuid ? { carrierEntityUuid: row.carrier_entity_uuid } : {}),
      ...(row.carrier_request_uuid ? { carrierRequestUuid: row.carrier_request_uuid } : {}),
      ...(row.carrier_raw_status ? { carrierRawStatus: row.carrier_raw_status } : {}),
      ...(row.carrier_last_error ? { carrierLastError: row.carrier_last_error } : {}),
      sender: this.toAddress(row.sender),
      recipient: this.toAddress(row.recipient),
      ...(cargoItems ? { cargoItems } : {}),
      goodsName: row.goods_name,
      declaredValue: Number(row.declared_value),
      declaredCurrency: row.declared_currency,
      taxIdOrDocumentNo: row.tax_id_or_document_no,
      weightKg: Number(row.weight_kg),
      lengthCm: Number(row.length_cm),
      widthCm: Number(row.width_cm),
      heightCm: Number(row.height_cm),
      packageCount: row.package_count,
      ...(row.cdek_tariff_code !== null ? { cdekTariffCode: row.cdek_tariff_code } : {}),
      ...(row.tracking_no ? { trackingNo: row.tracking_no } : {}),
      ...(row.carrier_reference_no ? { carrierReferenceNo: row.carrier_reference_no } : {}),
      ...(row.tracking_source ? { trackingSource: row.tracking_source } : {}),
      ...(row.label_uuid ? { labelUuid: row.label_uuid } : {}),
      ...(row.label_status ? { labelStatus: row.label_status } : {}),
      ...(row.label_url ? { labelUrl: row.label_url } : {}),
      ...(row.label_last_error ? { labelLastError: row.label_last_error } : {}),
      ...(row.tracking_sync_status ? { trackingSyncStatus: row.tracking_sync_status } : {}),
      ...(row.tracking_synced_at ? { trackingSyncedAt: row.tracking_synced_at } : {}),
      ...(row.review_failure_reason ? { reviewFailureReason: row.review_failure_reason } : {}),
      ...(row.last_mile_tracking_no ? { lastMileTrackingNo: row.last_mile_tracking_no } : {}),
      ...(estimatedQuote ? { estimatedQuote } : {}),
      events: (row.logistics_tracking_events ?? [])
        .slice()
        .sort((current, next) => new Date(next.occurred_at).getTime() - new Date(current.occurred_at).getTime())
        .map((event) => ({
          id: this.asOptionalString(this.asRecord(event.raw_payload).original_id) ?? event.id,
          status: event.status,
          title: event.title,
          description: event.description,
          location: event.location ?? "",
          occurredAt: event.occurred_at,
          source: event.source
        })),
      createdAt: row.created_at || this.asString(metadata.created_at) || new Date().toISOString()
    };
  }

  private toAddress(value: unknown): AddressContact {
    const record = this.asRecord(value);
    return {
      name: this.asString(record.name),
      phone: this.asString(record.phone),
      ...(this.asOptionalString(record.email) ? { email: this.asString(record.email) } : {}),
      country: this.asString(record.country),
      province: this.asString(record.province),
      city: this.asString(record.city),
      postalCode: this.asString(record.postalCode),
      addressLine: this.asString(record.addressLine),
      ...(this.asOptionalString(record.locationCode) ? { locationCode: this.asString(record.locationCode) } : {}),
      ...(this.asOptionalString(record.fiasGuid) ? { fiasGuid: this.asString(record.fiasGuid) } : {})
    };
  }

  private toCargoItems(value: unknown): CargoItem[] | undefined {
    if (!Array.isArray(value) || value.length === 0) {
      return undefined;
    }

    return value.map((item) => {
      const record = this.asRecord(item);
      return {
        name: this.asString(record.name),
        unitValueCny: Number(record.unitValueCny),
        quantity: Number(record.quantity)
      };
    });
  }

  private toQuote(value: unknown): LogisticsQuoteSnapshot | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as LogisticsQuoteSnapshot;
  }

  private normalizeOwnerEmail(ownerEmail?: string) {
    return ownerEmail?.trim().toLowerCase() || undefined;
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
