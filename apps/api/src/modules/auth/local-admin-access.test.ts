import assert from "node:assert/strict";

import { getLocalAdminEmails, isLocalAdminEmail } from "./local-admin-access";

const defaultEmails = getLocalAdminEmails();

assert.equal(defaultEmails.includes("cdek@ground.local"), true);
assert.equal(isLocalAdminEmail("cdek@ground.local"), true);
assert.equal(isLocalAdminEmail("ops@ground.local"), true);
assert.equal(isLocalAdminEmail("customer@example.com"), false);
assert.deepEqual(getLocalAdminEmails(undefined, "production"), []);
assert.equal(isLocalAdminEmail("cdek@ground.local", undefined, "production"), false);
assert.equal(isLocalAdminEmail("cdek@ground.local", undefined, "production", "true"), true);
