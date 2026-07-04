import assert from "node:assert/strict";

import { shopHomeActions } from "./shop-home-actions";

assert.deepEqual(
  shopHomeActions.map((action) => action.href),
  ["/shop/products", "/shop/orders"]
);

assert.deepEqual(
  shopHomeActions.map((action) => action.labelKey),
  ["shop.home.browse", "shop.home.orders"]
);
