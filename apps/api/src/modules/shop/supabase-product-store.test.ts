import assert from "node:assert/strict";
import type { CreateProductInput, Product } from "@ground/shared";
import { SupabaseProductStore, type SupabaseProductClient } from "./supabase-product-store";

type TableName = "products" | "product_skus";

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

  or(expression: string) {
    for (const clause of expression.split(",")) {
      const [column, operator, value] = clause.split(".");
      if (operator === "eq" && column && value) {
        this.filters[`or:${column}`] = value;
      }
    }
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
    if (this.action === "insert") {
      return this.database.insert(this.table, this.payload ?? {});
    }

    if (this.action === "update") {
      return this.database.update(this.table, this.payload as Record<string, unknown>, this.filters);
    }

    if (this.action === "delete") {
      return this.database.delete(this.table, this.filters);
    }

    return this.database.select(this.table, this.filters, this.limitValue);
  }
}

class FakeSupabaseDatabase {
  products: Array<Record<string, unknown>> = [];
  skus: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }

  select(table: TableName, filters: Record<string, string>, limit?: number) {
    const rows = table === "products" ? this.products : this.skus;
    const matched = rows.filter((row) => this.matches(row, filters));
    const withRelations = table === "products" ? matched.map((row) => this.withSkus(row)) : matched;
    return limit ? withRelations.slice(0, limit) : withRelations;
  }

  insert(table: TableName, payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: row.id ?? crypto.randomUUID(),
      ...row
    }));
    const target = table === "products" ? this.products : this.skus;
    target.push(...rows);
    return rows;
  }

  update(table: TableName, payload: Record<string, unknown>, filters: Record<string, string>) {
    const rows = table === "products" ? this.products : this.skus;
    const index = rows.findIndex((row) => this.matches(row, filters));
    if (index === -1) {
      return [];
    }

    rows[index] = { ...rows[index], ...payload };
    return [rows[index]!];
  }

  delete(table: TableName, filters: Record<string, string>) {
    const rows = table === "products" ? this.products : this.skus;
    const deleted = rows.filter((row) => this.matches(row, filters));
    const kept = rows.filter((row) => !this.matches(row, filters));

    if (table === "products") {
      this.products = kept;
      this.skus = this.skus.filter((sku) => sku.product_id !== deleted[0]?.id);
    } else {
      this.skus = kept;
    }

    return deleted;
  }

  private matches(row: Record<string, unknown>, filters: Record<string, string>) {
    const normalFilters = Object.entries(filters).filter(([key]) => !key.startsWith("or:"));
    const orFilters = Object.entries(filters).filter(([key]) => key.startsWith("or:"));
    const normalMatch = normalFilters.every(([key, value]) => String(row[key]) === value);
    const orMatch = orFilters.length === 0 || orFilters.some(([key, value]) => String(row[key.slice(3)]) === value);
    return normalMatch && orMatch;
  }

  private withSkus(product: Record<string, unknown>) {
    return {
      ...product,
      product_skus: this.skus.filter((sku) => sku.product_id === product.id)
    };
  }
}

const input: CreateProductInput = {
  slug: "supabase-product",
  name: "Supabase product",
  summary: "Stored in Supabase",
  description: "A product persisted through the Supabase product store.",
  imageUrl: "data:image/png;base64,cHJvZHVjdA==",
  galleryImageUrls: ["data:image/png;base64,Z2FsbGVyeQ=="],
  isPublished: true,
  categorySlug: "accessories",
  category: "Accessories",
  salesLabel: "New",
  originLabel: "China warehouse",
  serviceLabels: ["Manual confirmation"],
  detailSections: [{ title: "Details", body: "Useful details." }],
  skus: [{ model: "Standard", size: "One size", price: 12, currency: "USD", stockLabel: "In stock" }]
};

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseProductStore(database as unknown as SupabaseProductClient);
  const created = await store.createProduct(input);

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.match(created.skus[0]?.id ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(database.products.length, 1);
  assert.equal(database.skus.length, 1);
  assert.equal((database.products[0]?.gallery_image_urls as string[])[0], input.galleryImageUrls?.[0]);

  assert.equal((await store.listPublishedProducts()).length, 1);
  assert.equal((await store.getProduct(created.slug, { publishedOnly: true })).id, created.id);
  assert.equal(await store.findProductBySlug(input.slug), created.id);

  const updated = await store.updateProduct(created.id, {
    ...input,
    slug: "supabase-product-updated",
    isPublished: false,
    skus: [{ ...input.skus[0]!, price: 15 }]
  });

  assert.equal(updated.id, created.id);
  assert.equal(updated.slug, "supabase-product-updated");
  assert.equal(updated.isPublished, false);
  assert.equal(updated.skus[0]?.price, 15);
  assert.equal((await store.listPublishedProducts()).length, 0);

  const republished = await store.setProductPublished(created.id, true);
  assert.equal(republished.isPublished, true);

  const deleted = await store.deleteProduct(created.id);
  assert.equal(deleted.id, created.id);
  assert.equal((await store.listAdminProducts()).length, 0);
  assert.equal(database.skus.length, 0);
};

run();
