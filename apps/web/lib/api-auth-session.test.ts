import assert from "node:assert/strict";
import { getJson } from "./api";
import { saveLocalUserProfile } from "./local-user-profile";
import { clearSupabaseAuthSession, isSupabaseAdminSession, saveSupabaseAuthSession } from "./supabase-auth";

class MemoryLocalStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }
}

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: new MemoryLocalStorage(),
    dispatchEvent: () => undefined
  }
});

const originalFetch = globalThis.fetch;

const makeToken = (role: string) => {
  const payload = Buffer.from(JSON.stringify({ app_metadata: { role } })).toString("base64url");
  return `header.${payload}.signature`;
};

async function main() {
  let capturedHeaders: HeadersInit | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = init?.headers;
    return new Response("{}");
  }) as typeof fetch;

  saveSupabaseAuthSession({
    access_token: makeToken("customer"),
    user: { email: "Customer@Example.com" }
  });

  assert.equal(isSupabaseAdminSession(), false);
  await getJson("/customer-documents");
  assert.deepEqual(capturedHeaders, {
    Authorization: `Bearer ${makeToken("customer")}`
  });

  clearSupabaseAuthSession();
  capturedHeaders = undefined;

  saveSupabaseAuthSession({
    access_token: makeToken("admin"),
    user: { email: "Admin@Example.com" }
  });
  assert.equal(isSupabaseAdminSession(), true);
  await getJson("/customer-documents");
  assert.deepEqual(capturedHeaders, {
    Authorization: `Bearer ${makeToken("admin")}`
  });
  clearSupabaseAuthSession();
  capturedHeaders = undefined;

  await getJson("/shop/products");
  assert.equal(capturedHeaders, undefined);

  saveLocalUserProfile({
    name: "Customer",
    email: "LocalCustomer@Example.com",
    phone: "",
    country: "China",
    province: "",
    city: "",
    postalCode: "",
    addressLine: ""
  });
  await getJson("/shop/orders");
  assert.deepEqual(capturedHeaders, {
    "x-ground-dev-customer-email": "localcustomer@example.com"
  });

  globalThis.fetch = originalFetch;
}

void main();
