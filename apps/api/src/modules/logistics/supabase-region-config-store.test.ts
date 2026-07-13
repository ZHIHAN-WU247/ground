import assert from "node:assert/strict";
import { SupabaseRegionConfigStore, type SupabaseRegionConfigClient } from "./supabase-region-config-store";

type TableName = "countries" | "cities";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" = "select";
  private payload?: Record<string, unknown> | Array<Record<string, unknown>>;

  constructor(private readonly database: FakeSupabaseDatabase, private readonly table: TableName) {}

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
    if (this.action === "insert") return this.database.insert(this.table, this.payload ?? {});
    if (this.action === "update") return this.database.update(this.table, this.payload as Record<string, unknown>, this.filters);
    return this.database.select(this.table, this.filters);
  }
}

class FakeSupabaseDatabase {
  countries: Array<Record<string, unknown>> = [];
  cities: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }

  select(table: TableName, filters: Record<string, string>) {
    const rows = table === "countries" ? this.countries : this.cities;
    const matched = rows.filter((row) => this.matches(row, filters));

    if (table !== "countries") {
      return matched;
    }

    return matched.map((row) => ({
      ...row,
      cities: this.cities.filter((city) => city.country_id === row.id)
    }));
  }

  insert(table: TableName, payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      created_at: row.created_at ?? new Date().toISOString(),
      ...row
    }));
    const target = table === "countries" ? this.countries : this.cities;
    target.push(...rows);
    return rows;
  }

  update(table: TableName, payload: Record<string, unknown>, filters: Record<string, string>) {
    const rows = table === "countries" ? this.countries : this.cities;
    const updated: Array<Record<string, unknown>> = [];
    const nextRows = rows.map((row) => {
      if (!this.matches(row, filters)) {
        return row;
      }

      const next = { ...row, ...payload };
      updated.push(next);
      return next;
    });

    if (table === "countries") {
      this.countries = nextRows;
    } else {
      this.cities = nextRows;
    }

    return updated;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    return Object.entries(filters).every(([key, value]) => String(row[key]) === value);
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseRegionConfigStore(database as unknown as SupabaseRegionConfigClient);

  await store.seedDefaultsIfEmpty();
  assert.equal(database.countries.length, 4);
  assert.equal(database.cities.length, 5);

  const regions = await store.listRegions();
  assert.deepEqual(regions.map((country) => country.isoCode), ["RU", "KZ", "BY", "CN"]);
  assert.deepEqual(regions[0]?.cities.map((city) => city.name), ["Moscow", "Saint Petersburg"]);
  assert.equal(regions[0]?.cities[0]?.locationCode, "44");

  const updatedCountry = await store.updateCountry("KZ", { isActive: false });
  assert.equal(updatedCountry.isActive, false);

  const updatedCity = await store.updateCity(regions[0]!.cities[0]!.id, {
    postalCodeHint: "101001",
    isActive: false
  });
  assert.equal(updatedCity.postalCodeHint, "101001");
  assert.equal(updatedCity.isActive, false);

  await store.seedDefaultsIfEmpty();
  assert.equal(database.countries.length, 4);
  assert.equal(database.cities.length, 5);
};

void run();
