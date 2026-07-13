import assert from "node:assert/strict";
import { SupabaseCustomerDocumentStore, type SupabaseCustomerDocumentClient } from "./supabase-customer-document-store";

type TableName = "customer_documents";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload?: Record<string, unknown>;

  constructor(private readonly database: FakeSupabaseDatabase) {}

  select() { return this; }
  order() { return this; }
  limit() { return this; }

  eq(column: string, value: string | boolean) {
    this.filters[column] = String(value);
    return this;
  }

  insert(payload: Record<string, unknown>) {
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
    if (this.action === "update") return this.database.update(this.payload ?? {}, this.filters);
    if (this.action === "delete") return this.database.delete(this.filters);
    return this.database.select(this.filters);
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    assert.equal(table, "customer_documents");
    return new FakeSupabaseQuery(this);
  }

  select(filters: Record<string, string>) {
    return this.rows.filter((row) => this.matches(row, filters));
  }

  insert(payload: Record<string, unknown>) {
    const row = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload
    };
    this.rows.push(row);
    return [row];
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

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseCustomerDocumentStore(database as unknown as SupabaseCustomerDocumentClient);

  assert.deepEqual(await store.listDocuments(), []);

  const created = await store.saveDocument("Customer@Example.com", {
    id: "",
    documentType: "tax_id",
    documentNo: "RU-TAX-1",
    fileAssetId: "030ed125-052e-47f4-aceb-82db7548e633",
    metadata: { holderName: "Ivan Petrov" },
    createdAt: "",
    updatedAt: ""
  });

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.rows[0]?.owner_email, "customer@example.com");
  assert.equal(database.rows[0]?.document_type, "tax_id");
  assert.equal(database.rows[0]?.file_asset_id, "030ed125-052e-47f4-aceb-82db7548e633");
  assert.equal((database.rows[0]?.metadata as Record<string, unknown>).holderName, "Ivan Petrov");
  assert.equal(created.fileAssetId, "030ed125-052e-47f4-aceb-82db7548e633");

  assert.deepEqual((await store.listDocuments("CUSTOMER@example.com")).map((item) => item.id), [created.id]);
  assert.deepEqual(await store.listDocuments("other@example.com"), []);

  const updated = await store.saveDocument("customer@example.com", {
    ...created,
    documentNo: "RU-TAX-2",
    metadata: { holderName: "Ivan Updated" }
  });
  assert.equal(updated.id, created.id);
  assert.equal(updated.documentNo, "RU-TAX-2");
  assert.equal(updated.metadata.holderName, "Ivan Updated");

  await store.deleteDocument("customer@example.com", created.id);
  assert.equal((await store.listDocuments("customer@example.com")).length, 0);
};

void run();
