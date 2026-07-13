import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/rls-hardening.sql", import.meta.url), "utf8");
const normalizedSql = sql.replace(/\s+/g, " ");

const requiredFragments = [
  "lower(owner_email) = lower(auth.email())",
  "lower(owner_email) = lower(auth.email()) or public.current_user_is_admin()",
  "public.current_user_is_admin()",
  "alter table public.user_profiles force row level security",
  "alter table public.shop_orders force row level security",
  "alter table public.logistics_orders force row level security",
  "alter table public.file_assets force row level security",
  "after insert or update of email, raw_app_meta_data, raw_user_meta_data on auth.users",
  "create policy \"Users can read own shop order items\"",
  "create policy \"Users can read own logistics events\"",
  "create policy \"Admins can manage file metadata\""
];

for (const fragment of requiredFragments) {
  assert.ok(normalizedSql.includes(fragment), `Missing RLS hardening fragment: ${fragment}`);
}

const protectedTables = [
  "user_profiles",
  "recipient_addresses",
  "file_assets",
  "customer_documents",
  "logistics_orders",
  "logistics_tracking_events",
  "shop_orders",
  "shop_order_items",
  "audit_logs"
];

for (const table of protectedTables) {
  assert.ok(
    sql.includes(`alter table public.${table} enable row level security`),
    `Missing RLS enable statement for ${table}`
  );
  assert.ok(
    sql.includes(`alter table public.${table} force row level security`),
    `Missing RLS force statement for ${table}`
  );
}
