const assert: typeof import("node:assert/strict") = require("node:assert/strict");
const {
  getLogisticsOrderDetailLoginHref,
  hasLogisticsOrderDetailIdentity
}: typeof import("./logistics-order-detail-auth") = require("./logistics-order-detail-auth");

assert.equal(
  getLogisticsOrderDetailLoginHref("order 123"),
  "/auth/login?next=%2Flogistics%2Forders%2Forder%2520123"
);
assert.equal(hasLogisticsOrderDetailIdentity({ email: " Customer@Example.com " }, "token"), true);
assert.equal(hasLogisticsOrderDetailIdentity({ email: " Customer@Example.com " }, ""), false);
assert.equal(hasLogisticsOrderDetailIdentity({ email: " " }, "token"), false);
assert.equal(hasLogisticsOrderDetailIdentity(null, "token"), false);

export {};
