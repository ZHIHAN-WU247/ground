import assert from "node:assert/strict";
import type { LogisticsOrder } from "@ground/shared";
import { SupabaseLogisticsOrderStore, type SupabaseLogisticsOrderClient } from "./supabase-logistics-order-store";

type TableName = "logistics_orders" | "logistics_tracking_events";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload?: Record<string, unknown> | Array<Record<string, unknown>>;

  constructor(
    private readonly database: FakeSupabaseDatabase,
    private readonly table: TableName
  ) {}

  select() { return this; }
  order() { return this; }
  limit() { return this; }

  eq(column: string, value: string | boolean) {
    this.filters[column] = String(value);
    return this;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  single() {
    const data = this.execute()[0] ?? null;
    return Promise.resolve(data ? { data, error: null } : { data: null, error: { message: "not found" } });
  }

  maybeSingle() {
    const data = this.execute()[0] ?? null;
    return Promise.resolve({ data, error: null });
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.execute(), error: null }).then(onfulfilled, onrejected);
  }

  private execute() {
    if (this.action === "insert") return this.database.insert(this.table, this.payload ?? {});
    if (this.action === "update") return this.database.update(this.table, this.payload as Record<string, unknown>, this.filters);
    if (this.action === "delete") return this.database.delete(this.table, this.filters);
    return this.database.select(this.table, this.filters);
  }
}

class FakeSupabaseDatabase {
  orders: Array<Record<string, unknown>> = [];
  events: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }

  select(table: TableName, filters: Record<string, string>) {
    const rows = table === "logistics_orders" ? this.orders : this.events;
    const matched = rows.filter((row) => this.matches(row, filters));
    return table === "logistics_orders" ? matched.map((row) => this.withEvents(row)) : matched;
  }

  insert(table: TableName, payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      ...row
    }));
    const target = table === "logistics_orders" ? this.orders : this.events;
    target.push(...rows);
    return rows;
  }

  update(table: TableName, payload: Record<string, unknown>, filters: Record<string, string>) {
    const rows = table === "logistics_orders" ? this.orders : this.events;
    const index = rows.findIndex((row) => this.matches(row, filters));
    if (index === -1) return [];
    rows[index] = { ...rows[index], ...payload };
    return [rows[index]!];
  }

  delete(table: TableName, filters: Record<string, string>) {
    const rows = table === "logistics_orders" ? this.orders : this.events;
    const deleted = rows.filter((row) => this.matches(row, filters));
    const kept = rows.filter((row) => !this.matches(row, filters));

    if (table === "logistics_orders") {
      this.orders = kept;
      this.events = this.events.filter((event) => event.logistics_order_id !== deleted[0]?.id);
    } else {
      this.events = kept;
    }

    return deleted;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
  }

  private withEvents(order: Record<string, unknown>) {
    return {
      ...order,
      logistics_tracking_events: this.events.filter((event) => event.logistics_order_id === order.id)
    };
  }
}

const order: LogisticsOrder = {
  id: "log-local-1",
  orderNo: "AC202607100001",
  ownerEmail: "customer@example.com",
  cargoType: "B2C",
  routeId: "air-cdek",
  deliveryMethod: "TO_DOOR",
  status: "UNDER_REVIEW",
  reviewState: "PENDING",
  sender: {
    name: "Ground warehouse",
    phone: "+86 755 1000 2000",
    country: "China",
    province: "Guangdong",
    city: "Shenzhen",
    postalCode: "518000",
    addressLine: "Warehouse Road 1"
  },
  recipient: {
    name: "Ivan Petrov",
    phone: "+7 900 000 2200",
    email: "ivan@example.com",
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101000",
    addressLine: "Tverskaya Street 8",
    locationCode: "44"
  },
  cargoItems: [{ name: "Sneakers", unitValueCny: 88, quantity: 2 }],
  goodsName: "Sneakers",
  declaredValue: 176,
  declaredCurrency: "CNY",
  taxIdOrDocumentNo: "RU-DOC-1",
  weightKg: 2,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
  packageCount: 1,
  carrierName: "CDEK",
  carrierCreateState: "NOT_SUBMITTED",
  labelStatus: "NOT_REQUESTED",
  trackingSyncStatus: "NOT_STARTED",
  estimatedQuote: {
    deliveryMethod: "TO_DOOR",
    actualWeightKg: 2,
    volumetricWeightKg: 1,
    chargeableWeightKg: 2,
    amount: 10,
    firstMileAmount: 0,
    lastMileAmount: 2,
    totalAmount: 12,
    currency: "USD"
  },
  events: [{
    id: "event-local-1",
    status: "UNDER_REVIEW",
    title: "Order submitted",
    description: "Waiting for review.",
    location: "Shenzhen",
    occurredAt: "2026-07-10T00:00:00.000Z",
    source: "MANUAL"
  }],
  createdAt: "2026-07-10T00:00:00.000Z"
};

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseLogisticsOrderStore(database as unknown as SupabaseLogisticsOrderClient);
  const created = await store.createOrder(order);

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(created.orderNo, order.orderNo);
  assert.equal(created.ownerEmail, "customer@example.com");
  assert.equal(created.events.length, 1);
  assert.equal(created.cargoItems?.[0]?.name, "Sneakers");
  assert.equal(database.orders[0]?.order_no, order.orderNo);
  assert.equal(database.events[0]?.title, "Order submitted");

  assert.deepEqual((await store.listOrders("Customer@Example.com")).map((item: LogisticsOrder) => item.id), [created.id]);
  assert.equal((await store.listOrders()).length, 0);
  assert.equal((await store.getOrder(created.orderNo)).id, created.id);
  assert.equal((await store.getOrder(created.id)).orderNo, order.orderNo);
  assert.equal((await store.getOrder(created.id, "Customer@Example.com")).id, created.id);
  await assert.rejects(() => store.getOrder(created.id, "other@example.com"), /not found/i);

  created.status = "APPROVED";
  created.reviewState = "APPROVED";
  created.trackingNo = "TRACK-1";
  created.trackingSource = "MANUAL";
  created.events.unshift({
    id: "event-local-2",
    status: "APPROVED",
    title: "Tracking assigned",
    description: "Manual tracking assigned.",
    location: "Operations",
    occurredAt: "2026-07-10T01:00:00.000Z",
    source: "MANUAL"
  });

  const saved = await store.saveOrder(created);
  assert.equal(saved.status, "APPROVED");
  assert.equal(saved.trackingNo, "TRACK-1");
  assert.equal(saved.events.length, 2);
  assert.equal(database.events.length, 2);

  await store.deleteOrder(created.id);
  await assert.rejects(() => store.getOrder(created.id), /not found/i);
  assert.equal(database.events.length, 0);
};

void run();
