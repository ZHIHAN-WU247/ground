import assert from "node:assert/strict";

import { getAdminJson, postAdminFormData } from "./api";
import { clearSupabaseAuthSession, saveSupabaseAuthSession } from "./supabase-auth";

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

const installBrowserStorage = () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: new MemoryLocalStorage(),
      dispatchEvent: () => undefined
    }
  });
};

const originalFetch = globalThis.fetch;

const makeToken = (role: string) => {
  const payload = Buffer.from(JSON.stringify({ app_metadata: { role } })).toString("base64url");
  return `header.${payload}.signature`;
};

async function main() {
  installBrowserStorage();

  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response("{}");
  }) as typeof fetch;

  await assert.rejects(() => getAdminJson("/admin/shop/orders"), /Admin access is required/);
  assert.equal(fetchCalled, false);

  installBrowserStorage();
  saveSupabaseAuthSession({
    access_token: makeToken("customer"),
    user: { email: "customer@example.com" }
  });

  await assert.rejects(() => getAdminJson("/admin/shop/orders"), /Admin access is required/);
  assert.equal(fetchCalled, false);

  installBrowserStorage();
  saveSupabaseAuthSession({
    access_token: makeToken("admin"),
    user: { email: "admin@example.com" }
  });

  let capturedHeaders: HeadersInit | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = init?.headers;
    return new Response("{}");
  }) as typeof fetch;

  await getAdminJson("/admin/shop/orders");
  assert.deepEqual(capturedHeaders, {
    Authorization: `Bearer ${makeToken("admin")}`,
    "x-ground-dev-admin": "true",
    "x-ground-dev-admin-email": "admin@example.com"
  });

  let capturedBody: BodyInit | null | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedHeaders = init?.headers;
    capturedBody = init?.body;
    return new Response("{}");
  }) as typeof fetch;

  const formData = new FormData();
  formData.set("file", new Blob(["image"], { type: "image/webp" }), "image.webp");
  await postAdminFormData("/admin/shop/product-images", formData);
  assert.equal(capturedBody, formData);
  assert.deepEqual(capturedHeaders, {
    Authorization: `Bearer ${makeToken("admin")}`,
    "x-ground-dev-admin": "true",
    "x-ground-dev-admin-email": "admin@example.com"
  });
  assert.equal(Object.prototype.hasOwnProperty.call(capturedHeaders as Record<string, string>, "Content-Type"), false);

  clearSupabaseAuthSession();

  globalThis.fetch = originalFetch;
}

void main();
