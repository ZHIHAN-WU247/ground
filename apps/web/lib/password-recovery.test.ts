import assert from "node:assert/strict";

import { buildPasswordRecoveryPath, isPasswordRecoveryHash } from "./password-recovery";

const recoveryHash = "#access_token=token&refresh_token=refresh&type=recovery";

assert.equal(isPasswordRecoveryHash(recoveryHash), true);
assert.equal(isPasswordRecoveryHash("#access_token=token&type=recovery"), false);
assert.equal(isPasswordRecoveryHash("#access_token=token&refresh_token=refresh&type=signup"), false);
assert.equal(buildPasswordRecoveryPath(recoveryHash), "/auth/reset-password#access_token=token&refresh_token=refresh&type=recovery");
assert.equal(buildPasswordRecoveryPath("access_token=token&refresh_token=refresh&type=recovery"), "/auth/reset-password#access_token=token&refresh_token=refresh&type=recovery");
