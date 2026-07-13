import assert from "node:assert/strict";
import { SupabaseCarrierConfigStore, type SupabaseCarrierConfigClient } from "./supabase-carrier-config-store";

type TableName = "carrier_configs";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" = "select";
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
    return this.database.select(this.filters);
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    assert.equal(table, "carrier_configs");
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

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseCarrierConfigStore(database as unknown as SupabaseCarrierConfigClient);

  await store.seedDefaultsIfEmpty();
  assert.deepEqual(database.rows.map((row) => row.provider_code), ["fixed", "cdek"]);

  const configs = await store.listConfigs();
  assert.equal(configs[1]?.providerCode, "cdek");
  assert.equal(configs[1]?.apiBaseUrl, "https://api.cdek.ru");
  assert.equal(configs[1]?.credentialRef, "CDEK_CLIENT_ID/CDEK_CLIENT_SECRET");
  assert.equal(configs[1]?.metadata.mode, "api");

  const updated = await store.updateConfig("cdek", {
    isActive: false,
    apiBaseUrl: "https://api.edu.cdek.ru",
    credentialRef: "CDEK_TEST_CLIENT_ID/CDEK_TEST_CLIENT_SECRET",
    metadata: { mode: "test", writesEnabled: false }
  });

  assert.equal(updated.providerCode, "cdek");
  assert.equal(updated.isActive, false);
  assert.equal(updated.apiBaseUrl, "https://api.edu.cdek.ru");
  assert.equal(updated.credentialRef, "CDEK_TEST_CLIENT_ID/CDEK_TEST_CLIENT_SECRET");
  assert.equal(updated.metadata.mode, "test");

  await store.seedDefaultsIfEmpty();
  assert.equal(database.rows.length, 2);

  const preserved = await store.updateConfig("cdek", {
    apiBaseUrl: "https://api.cdek.ru/v2"
  });
  assert.equal(preserved.credentialRef, "CDEK_TEST_CLIENT_ID/CDEK_TEST_CLIENT_SECRET");
};

const runBackfill = async () => {
  const database = new FakeSupabaseDatabase();
  database.rows.push({
    id: crypto.randomUUID(),
    provider_code: "cdek",
    display_name: "CDEK",
    api_base_url: "https://api.cdek.ru/v2",
    credential_ref: null,
    is_active: true,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const store = new SupabaseCarrierConfigStore(database as unknown as SupabaseCarrierConfigClient);

  await store.seedDefaultsIfEmpty();

  const cdek = database.rows.find((row) => row.provider_code === "cdek");
  assert.equal(cdek?.api_base_url, "https://api.cdek.ru/v2");
  assert.equal(cdek?.credential_ref, "CDEK_CLIENT_ID/CDEK_CLIENT_SECRET");
  assert.deepEqual(cdek?.metadata, { mode: "api" });
};

void run().then(runBackfill);
