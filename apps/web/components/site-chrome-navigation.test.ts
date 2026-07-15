import assert from "node:assert/strict";

import { publicNavItems } from "./site-chrome-navigation";

assert.deepEqual(
  publicNavItems.map((item) => item.href),
  ["/logistics", "/shop"]
);
assert.equal(publicNavItems.some((item) => item.href.startsWith("/admin")), false);
