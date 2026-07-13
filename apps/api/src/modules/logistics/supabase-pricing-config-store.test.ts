import assert from "node:assert/strict";
import { SupabasePricingConfigStore, type SupabasePricingConfigClient } from "./supabase-pricing-config-store";

type TableName = "pricing_tables" | "pricing_rules";

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
  tables: Array<Record<string, unknown>> = [];
  rules: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }

  select(table: TableName, filters: Record<string, string>) {
    const rows = table === "pricing_tables" ? this.tables : this.rules;
    const matched = rows.filter((row) => this.matches(row, filters));

    if (table !== "pricing_tables") {
      return matched;
    }

    return matched.map((row) => ({
      ...row,
      pricing_rules: this.rules.filter((rule) => rule.pricing_table_id === row.id)
    }));
  }

  insert(table: TableName, payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
      ...row
    }));
    const target = table === "pricing_tables" ? this.tables : this.rules;
    target.push(...rows);
    return rows;
  }

  update(table: TableName, payload: Record<string, unknown>, filters: Record<string, string>) {
    const rows = table === "pricing_tables" ? this.tables : this.rules;
    const updated: Array<Record<string, unknown>> = [];
    const nextRows = rows.map((row) => {
      if (!this.matches(row, filters)) {
        return row;
      }

      const next = { ...row, ...payload, updated_at: new Date().toISOString() };
      updated.push(next);
      return next;
    });

    if (table === "pricing_tables") {
      this.tables = nextRows;
    } else {
      this.rules = nextRows;
    }

    return updated;
  }

  delete(table: TableName, filters: Record<string, string>) {
    const rows = table === "pricing_tables" ? this.tables : this.rules;
    const deleted = rows.filter((row) => this.matches(row, filters));
    const kept = rows.filter((row) => !this.matches(row, filters));

    if (table === "pricing_tables") {
      this.tables = kept;
      this.rules = this.rules.filter((rule) => rule.pricing_table_id !== deleted[0]?.id);
    } else {
      this.rules = kept;
    }

    return deleted;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabasePricingConfigStore(database as unknown as SupabasePricingConfigClient);

  await store.seedDefaultsIfEmpty();
  assert.equal(database.tables.length, 4);
  assert.equal(database.rules.length, 4);

  const configs = await store.listRouteConfigs();
  assert.deepEqual(configs.map((config) => config.routeId), ["air-ems", "air-cdek", "land-cdek", "land-russia-post"]);
  assert.equal(configs[0]?.formula, "half_kg_step");
  assert.equal(configs[0]?.baseAmount, 185);
  assert.equal(configs[1]?.firstMileCnyPerKg, 90);
  assert.equal(configs[1]?.rubPerCny, 11);

  const updated = await store.updateRouteConfig("air-cdek", {
    isActive: false,
    firstMileCnyPerKg: 120,
    rubPerCny: 12
  });

  assert.equal(updated.routeId, "air-cdek");
  assert.equal(updated.isActive, false);
  assert.equal(updated.firstMileCnyPerKg, 120);
  assert.equal((database.rules[1]?.metadata as Record<string, unknown>).rub_per_cny, 12);

  await store.seedDefaultsIfEmpty();
  assert.equal(database.tables.length, 4);
};

const runPartialSeed = async () => {
  const database = new FakeSupabaseDatabase();
  const existingId = crypto.randomUUID();
  database.tables.push({
    id: existingId,
    cargo_type: "B2C",
    route_id: "air-cdek",
    delivery_method: "TO_DOOR",
    name: "Existing air cdek",
    currency: "USD",
    is_active: true,
    template_version: "2026-07-09",
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const store = new SupabasePricingConfigStore(database as unknown as SupabasePricingConfigClient);

  await store.seedDefaultsIfEmpty();

  assert.equal(database.tables.length, 4);
  assert.equal(database.rules.length, 4);
  assert.equal(database.rules.some((rule) => rule.pricing_table_id === existingId), true);
};

void run().then(runPartialSeed);
