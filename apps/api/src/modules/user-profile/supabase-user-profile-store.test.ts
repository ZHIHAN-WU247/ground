import assert from "node:assert/strict";
import type { AddressContact } from "@ground/shared";
import { SupabaseUserProfileStore, type SupabaseUserProfileClient } from "./supabase-user-profile-store";

type TableName = "user_profiles";

interface FakeAuthUser {
  id: string;
  email?: string;
}

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};
  private action: "select" | "update" | "insert" = "select";
  private payload?: Record<string, unknown>;

  constructor(private readonly database: FakeSupabaseDatabase) {}

  select() { return this; }
  limit() { return this; }

  eq(column: string, value: string) {
    this.filters[column] = value;
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
    if (this.action === "insert") return this.database.insert(this.payload ?? {});
    if (this.action === "update") return this.database.update(this.payload ?? {}, this.filters);
    return this.database.select(this.filters);
  }
}

class FakeSupabaseDatabase {
  users: FakeAuthUser[] = [];
  profiles: Array<Record<string, unknown>> = [];
  auth = {
    admin: {
      listUsers: async () => ({ data: { users: this.users }, error: null }),
      createUser: async ({ email, user_metadata }: { email: string; user_metadata?: Record<string, unknown> }) => {
        const user = { id: crypto.randomUUID(), email };
        this.users.push(user);
        this.profiles.push({
          id: user.id,
          email,
          display_name: String(user_metadata?.display_name ?? ""),
          role: "customer",
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return { data: { user }, error: null };
      }
    }
  };

  from(table: TableName) {
    assert.equal(table, "user_profiles");
    return new FakeSupabaseQuery(this);
  }

  select(filters: Record<string, string>) {
    return this.profiles.filter((row) => this.matches(row, filters));
  }

  insert(payload: Record<string, unknown>) {
    const row = {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload
    };
    this.profiles.push(row);
    return [row];
  }

  update(payload: Record<string, unknown>, filters: Record<string, string>) {
    const updated: Array<Record<string, unknown>> = [];
    this.profiles = this.profiles.map((row) => {
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

const profile: AddressContact = {
  name: "Alice Zhang",
  phone: "+86 755 1234 5678",
  email: "Alice@Example.com",
  country: "China",
  province: "Guangdong",
  city: "Shenzhen",
  postalCode: "518000",
  addressLine: "Tech Park 1",
  locationCode: "CN-SZ"
};

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseUserProfileStore(database as unknown as SupabaseUserProfileClient);

  assert.equal(await store.findByEmail("missing@example.com"), null);

  const created = await store.saveProfile(profile);
  assert.match(database.users[0]?.id ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(created.email, "alice@example.com");
  assert.equal(created.name, "Alice Zhang");
  assert.equal(created.locationCode, "CN-SZ");
  assert.equal(database.profiles.length, 1);
  assert.equal(database.profiles[0]?.email, "alice@example.com");
  assert.equal(database.profiles[0]?.display_name, "Alice Zhang");
  assert.equal((database.profiles[0]?.metadata as Record<string, unknown>).phone, "+86 755 1234 5678");

  const loaded = await store.findByEmail("ALICE@example.com");
  assert.deepEqual(loaded, created);

  const updated = await store.saveProfile({
    ...created,
    name: "Alice Updated",
    city: "Guangzhou",
    fiasGuid: "fias-1"
  });

  assert.equal(updated.name, "Alice Updated");
  assert.equal(updated.city, "Guangzhou");
  assert.equal(updated.fiasGuid, "fias-1");
  assert.equal(database.users.length, 1);
  assert.equal(database.profiles.length, 1);
};

void run();
