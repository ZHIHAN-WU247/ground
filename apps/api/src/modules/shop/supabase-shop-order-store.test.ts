import assert from "node:assert/strict";
import type { AddressContact, ShopOrder, ShopOrderStatus } from "@ground/shared";
import { SupabaseShopOrderStore, type SupabaseShopOrderClient } from "./supabase-shop-order-store";

type TableName = "shop_orders" | "shop_order_items";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private limitValue?: number;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload?: Record<string, unknown> | Array<Record<string, unknown>>;

  constructor(
    private readonly database: FakeSupabaseDatabase,
    private readonly table: TableName
  ) {}

  select() {
    return this;
  }

  order() {
    return this;
  }

  eq(column: string, value: string | boolean) {
    this.filters[column] = String(value);
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
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
    return this.database.select(this.table, this.filters, this.limitValue);
  }
}

class FakeSupabaseDatabase {
  orders: Array<Record<string, unknown>> = [];
  items: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }

  select(table: TableName, filters: Record<string, string>, limit?: number) {
    const rows = table === "shop_orders" ? this.orders : this.items;
    const matched = rows.filter((row) => this.matches(row, filters));
    const withRelations = table === "shop_orders" ? matched.map((row) => this.withItems(row)) : matched;
    return limit ? withRelations.slice(0, limit) : withRelations;
  }

  insert(table: TableName, payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      ...row
    }));
    const target = table === "shop_orders" ? this.orders : this.items;
    target.push(...rows);
    return rows;
  }

  update(table: TableName, payload: Record<string, unknown>, filters: Record<string, string>) {
    const rows = table === "shop_orders" ? this.orders : this.items;
    const index = rows.findIndex((row) => this.matches(row, filters));
    if (index === -1) return [];
    rows[index] = { ...rows[index], ...payload };
    return [rows[index]!];
  }

  delete(table: TableName, filters: Record<string, string>) {
    const rows = table === "shop_orders" ? this.orders : this.items;
    const deleted = rows.filter((row) => this.matches(row, filters));
    const kept = rows.filter((row) => !this.matches(row, filters));
    if (table === "shop_orders") {
      this.orders = kept;
      this.items = this.items.filter((item) => item.shop_order_id !== deleted[0]?.id);
    } else {
      this.items = kept;
    }
    return deleted;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
  }

  private withItems(order: Record<string, unknown>) {
    return {
      ...order,
      shop_order_items: this.items.filter((item) => item.shop_order_id === order.id)
    };
  }
}

const recipient: AddressContact = {
  name: "Ivan Petrov",
  phone: "+7 900 000 2200",
  email: "ivan@example.com",
  country: "Russia",
  province: "Moscow",
  city: "Moscow",
  postalCode: "101000",
  addressLine: "Tverskaya Street 8"
};

const orderInput: Omit<ShopOrder, "id" | "createdAt"> & { items: Array<ShopOrder["items"][number] & { currency: ShopOrder["currency"] }> } = {
  orderNo: "SH202600000001",
  ownerEmail: "customer@example.com",
  status: "PENDING_CONFIRMATION",
  recipient,
  totalAmount: 24,
  currency: "USD",
  items: [{
    productId: "product-1",
    productName: "Stored product",
    productSlug: "stored-product",
    productImageUrl: "data:image/png;base64,cHJvZHVjdA==",
    skuId: "sku-1",
    skuModel: "Standard",
    skuSize: "One size",
    quantity: 2,
    unitPrice: 12,
    currency: "USD"
  }]
};

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseShopOrderStore(database as unknown as SupabaseShopOrderClient);
  const created = await store.createOrder(orderInput);

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.orders.length, 1);
  assert.equal(database.items.length, 1);
  assert.equal(created.items[0]?.productName, "Stored product");
  assert.equal(created.ownerEmail, "customer@example.com");
  assert.deepEqual((database.orders[0]?.recipient as AddressContact).city, "Moscow");

  assert.deepEqual((await store.listOrders("Customer@Example.com")).map((order: ShopOrder) => order.id), [created.id]);
  assert.equal((await store.listOrders()).length, 0);
  assert.equal((await store.getOrder(created.orderNo, "customer@example.com")).id, created.id);
  await assert.rejects(() => store.getOrder(created.id, "other@example.com"), /not found/i);
  assert.equal((await store.listAdminOrders()).some((order: ShopOrder) => order.id === created.id), true);

  const confirmed = await store.updateOrderStatus(created.id, "CONFIRMED" satisfies ShopOrderStatus);
  assert.equal(confirmed.status, "CONFIRMED");
  assert.equal((await store.listLogisticsHandoffs()).some((order: ShopOrder) => order.id === created.id), true);
  await assert.rejects(() => store.updateOrderStatus(created.id, "CANCELLED"), /pending confirmation/i);

  const linked = await store.linkOrderToLogistics(created.id, { id: "log-json-1", orderNo: "AC202607100001" });
  assert.equal(linked.status, "LINKED_TO_LOGISTICS");
  assert.equal(linked.logisticsOrderId, "log-json-1");
  assert.equal(linked.logisticsReferenceNo, "AC202607100001");
  assert.equal(database.orders[0]?.logistics_order_id, null);
  assert.equal((database.orders[0]?.metadata as Record<string, unknown>).logistics_order_id, "log-json-1");
  assert.equal((await store.listLogisticsHandoffs()).length, 0);
};

void run();
