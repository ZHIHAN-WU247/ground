import assert from "node:assert/strict";
import type { ContentBanner } from "@ground/shared";
import { SupabaseBannerStore, type SupabaseBannerClient } from "./supabase-banner-store";

type TableName = "banners";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "insert" | "update" = "select";
  private payload?: Record<string, unknown>;

  constructor(private readonly database: FakeSupabaseDatabase) {}

  select() { return this; }
  order() { return this; }

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
    if (this.action === "insert") return [this.database.insert(this.payload ?? {})];
    if (this.action === "update") return this.database.update(this.payload ?? {}, this.filters);
    return this.database.select(this.filters);
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    assert.equal(table, "banners");
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
    return row;
  }

  update(payload: Record<string, unknown>, filters: Record<string, string>) {
    const updated: Array<Record<string, unknown>> = [];
    this.rows = this.rows.map((row) => {
      if (!this.matches(row, filters)) return row;
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
  const store = new SupabaseBannerStore(database as unknown as SupabaseBannerClient);

  const created = await store.saveBanner({
    id: "",
    title: "Summer logistics",
    subtitle: "Fast route discount",
    imageUrl: "https://example.com/banner.jpg",
    href: "/logistics/quote",
    placement: "home",
    isActive: true,
    sortOrder: 3,
    metadata: { campaign: "summer" },
    createdAt: "",
    updatedAt: ""
  });

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.rows[0]?.title, "Summer logistics");
  assert.equal(database.rows[0]?.subtitle, "Fast route discount");
  assert.equal(database.rows[0]?.image_url, "https://example.com/banner.jpg");
  assert.equal(database.rows[0]?.href, "/logistics/quote");
  assert.equal(database.rows[0]?.placement, "home");
  assert.equal(database.rows[0]?.is_active, true);
  assert.equal(database.rows[0]?.sort_order, 3);
  assert.equal((database.rows[0]?.metadata as Record<string, unknown>).campaign, "summer");

  database.insert({
    title: "Draft banner",
    subtitle: null,
    image_url: null,
    href: null,
    placement: "home",
    is_active: false,
    sort_order: 1,
    metadata: {}
  });

  assert.deepEqual((await store.listActiveBanners("home")).map((item: ContentBanner) => item.id), [created.id]);
  assert.equal((await store.listAdminBanners()).length, 2);

  const updated = await store.saveBanner({ ...created, title: "Updated banner", isActive: false });
  assert.equal(updated.id, created.id);
  assert.equal(updated.title, "Updated banner");
  assert.equal(updated.isActive, false);
};

void run();
