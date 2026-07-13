import assert from "node:assert/strict";
import { SupabaseAuditLogStore, type SupabaseAuditLogClient } from "./supabase-audit-log-store";

type TableName = "audit_logs";

class FakeSupabaseQuery {
  private action: "select" | "insert" = "select";
  private payload?: Record<string, unknown>;
  private limitValue?: number;

  constructor(private readonly database: FakeSupabaseDatabase) {}

  select() { return this; }
  order() { return this; }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  single() {
    const data = this.execute()[0] ?? null;
    return Promise.resolve(data ? { data, error: null } : { data: null, error: { message: "not found" } });
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.execute(), error: null }).then(onfulfilled, onrejected);
  }

  private execute() {
    if (this.action === "insert") return [this.database.insert(this.payload ?? {})];
    return this.database.select(this.limitValue);
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];

  from(table: TableName) {
    assert.equal(table, "audit_logs");
    return new FakeSupabaseQuery(this);
  }

  insert(payload: Record<string, unknown>) {
    const row = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload
    };
    this.rows.unshift(row);
    return row;
  }

  select(limit?: number) {
    return typeof limit === "number" ? this.rows.slice(0, limit) : this.rows;
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseAuditLogStore(database as unknown as SupabaseAuditLogClient);

  const created = await store.recordLog({
    actorUserId: "local-admin-admin@example.com",
    actorEmail: "Admin@Example.com",
    action: "content.banner.save",
    entityType: "banner",
    entityId: "030ed125-052e-47f4-aceb-82db7548e633",
    beforeData: null,
    afterData: { title: "Homepage promo" },
    ipAddress: "127.0.0.1",
    userAgent: "node-test"
  });

  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(database.rows[0]?.actor_user_id, null);
  assert.equal(database.rows[0]?.actor_email, "admin@example.com");
  assert.equal(database.rows[0]?.action, "content.banner.save");
  assert.equal(database.rows[0]?.entity_type, "banner");
  assert.equal(database.rows[0]?.entity_id, "030ed125-052e-47f4-aceb-82db7548e633");
  assert.equal((database.rows[0]?.after_data as Record<string, unknown>).title, "Homepage promo");
  assert.equal(created.actorEmail, "admin@example.com");
  assert.equal(created.actorUserId, undefined);

  await store.recordLog({
    actorUserId: "6c319af4-aab8-485c-9d92-fb7ec05d32b7",
    actorEmail: "ops@example.com",
    action: "shop.product.update",
    entityType: "product",
    entityId: "6c319af4-aab8-485c-9d92-fb7ec05d32b7",
    beforeData: { name: "Old" },
    afterData: { name: "New" }
  });

  const logs = await store.listLogs(1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.action, "shop.product.update");
  assert.equal(logs[0]?.actorUserId, "6c319af4-aab8-485c-9d92-fb7ec05d32b7");
};

void run();
