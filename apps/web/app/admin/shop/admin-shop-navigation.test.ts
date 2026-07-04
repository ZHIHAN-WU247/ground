import assert from "node:assert/strict";
import {
  adminShopNavigationItems,
  getActiveAdminShopSection
} from "./admin-shop-navigation";

assert.equal(getActiveAdminShopSection("/admin/shop/products"), "products");
assert.equal(getActiveAdminShopSection("/admin/shop/products/new"), "products");
assert.equal(getActiveAdminShopSection("/admin/shop/orders"), "orders");
assert.equal(getActiveAdminShopSection("/admin/shop/orders/shop-1"), "orders");
assert.equal(
  adminShopNavigationItems.some((item) => item.href === "/admin/shop/orders"),
  true
);
