import assert from "node:assert/strict";
import { accountLinks, getActiveAccountHref } from "./account-navigation";

assert.equal(
  accountLinks.some((item) => item.href === "/account/orders" && item.labelKey === "account.nav.orders"),
  true
);

assert.equal(getActiveAccountHref("/account/profile"), "/account/profile");
assert.equal(getActiveAccountHref("/account/orders"), "/account/orders");
assert.equal(getActiveAccountHref("/account/orders/order-1"), "/account/orders");
assert.equal(getActiveAccountHref("/account/senders"), "/account/senders");
assert.equal(getActiveAccountHref("/account/recipients"), "/account/recipients");
assert.equal(getActiveAccountHref("/account/documents"), "/account/documents");
