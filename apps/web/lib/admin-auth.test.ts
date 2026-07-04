import assert from "node:assert/strict";

import { authenticateAdminAccount } from "./admin-auth";

const success = authenticateAdminAccount("cdek", "cdek123");
assert.equal(success.ok, true);

if (success.ok) {
  assert.equal(success.profile.email, "cdek@ground.local");
  assert.equal(success.profile.name, "CDEK Admin");
}

const failure = authenticateAdminAccount("cdek", "wrong-password");
assert.equal(failure.ok, false);
