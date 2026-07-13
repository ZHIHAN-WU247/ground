import assert from "node:assert/strict";
import type { AddressContact } from "@ground/shared";
import { SupabaseAddressBookStore, type SupabaseAddressBookClient } from "./supabase-address-book-store";

type TableName = "recipient_addresses";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload?: Record<string, unknown> | Array<Record<string, unknown>>;

  constructor(private readonly database: FakeSupabaseDatabase) {}

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
    if (this.action === "insert") return this.database.insert(this.payload ?? {});
    if (this.action === "update") return this.database.update(this.payload as Record<string, unknown>, this.filters);
    if (this.action === "delete") return this.database.delete(this.filters);
    return this.database.select(this.filters);
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    assert.equal(table, "recipient_addresses");
    return new FakeSupabaseQuery(this);
  }

  select(filters: Record<string, string>) {
    return this.rows.filter((row) => this.matches(row, filters));
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      ...row
    }));
    this.rows.push(...rows);
    return rows;
  }

  update(payload: Record<string, unknown>, filters: Record<string, string>) {
    const updated: Array<Record<string, unknown>> = [];

    this.rows = this.rows.map((row) => {
      if (!this.matches(row, filters)) {
        return row;
      }

      const next = { ...row, ...payload, updated_at: new Date().toISOString() };
      updated.push(next);
      return next;
    });

    return updated;
  }

  delete(filters: Record<string, string>) {
    const deleted = this.rows.filter((row) => this.matches(row, filters));
    this.rows = this.rows.filter((row) => !this.matches(row, filters));
    return deleted;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
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
  addressLine: "Tverskaya Street 8",
  locationCode: "44"
};

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseAddressBookStore(database as unknown as SupabaseAddressBookClient);

  const home = await store.saveEntry("Customer@Example.com", {
    id: "",
    label: "Home",
    kind: "recipient",
    isDefault: true,
    createdAt: "",
    updatedAt: "",
    ...recipient
  });

  const office = await store.saveEntry("customer@example.com", {
    id: "",
    label: "Office",
    kind: "recipient",
    isDefault: true,
    createdAt: "",
    updatedAt: "",
    ...recipient,
    city: "Saint Petersburg"
  });

  const sender = await store.saveEntry("customer@example.com", {
    id: "",
    label: "Warehouse",
    kind: "sender",
    isDefault: false,
    createdAt: "",
    updatedAt: "",
    ...recipient,
    country: "China",
    city: "Shenzhen"
  });

  assert.match(home.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.rows.length, 3);
  assert.equal(database.rows[0]?.owner_email, "customer@example.com");
  assert.equal((database.rows[0]?.metadata as Record<string, unknown>).is_default, false);
  assert.equal((database.rows[1]?.metadata as Record<string, unknown>).is_default, true);

  const recipients = await store.listEntries("customer@example.com", "recipient");
  assert.deepEqual(recipients.map((entry) => entry.id), [office.id, home.id]);
  assert.equal(recipients[0]?.isDefault, true);
  assert.equal((await store.listEntries("customer@example.com", "sender"))[0]?.id, sender.id);
  assert.equal((await store.listEntries()).length, 0);

  const updated = await store.saveEntry("customer@example.com", {
    ...office,
    label: "Office updated",
    city: "Kazan",
    isDefault: false
  });

  assert.equal(updated.id, office.id);
  assert.equal(updated.label, "Office updated");
  assert.equal(updated.city, "Kazan");

  await store.deleteEntry("CUSTOMER@example.com", home.id);
  assert.deepEqual((await store.listEntries("customer@example.com", "recipient")).map((entry) => entry.id), [office.id]);
};

void run();
