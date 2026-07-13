import assert from "node:assert/strict";

import { findLocalAuthAccountByLogin, registerLocalAuthAccount } from "./local-auth";

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
    localStorage: new MemoryLocalStorage()
  }
});

assert.equal(registerLocalAuthAccount({ account: "customer", email: "customer@example.com", password: "secret" }).ok, true);
assert.equal(findLocalAuthAccountByLogin("customer")?.email, "customer@example.com");

assert.deepEqual(registerLocalAuthAccount({ account: "cdek", email: "customer-admin-name@example.com", password: "secret" }), {
  ok: false,
  reason: "reserved_account"
});
assert.deepEqual(registerLocalAuthAccount({ account: "ops", email: "cdek@ground.local", password: "secret" }), {
  ok: false,
  reason: "reserved_account"
});
assert.equal(findLocalAuthAccountByLogin("cdek"), null);
assert.equal(findLocalAuthAccountByLogin("cdek@ground.local"), null);
