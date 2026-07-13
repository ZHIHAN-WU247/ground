import assert from "node:assert/strict";
const { isCheckoutOrderAuthReady } = require("./checkout-auth") as typeof import("./checkout-auth");

assert.equal(isCheckoutOrderAuthReady(""), false);
assert.equal(isCheckoutOrderAuthReady("   "), false);
assert.equal(isCheckoutOrderAuthReady("supabase-access-token"), true);
