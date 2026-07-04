import assert from "node:assert/strict";

import { buildLoginRedirectPath, getSafeAuthReturnPath } from "./auth-redirect";

assert.equal(buildLoginRedirectPath("/logistics/orders/new"), "/auth/login?next=%2Flogistics%2Forders%2Fnew");
assert.equal(buildLoginRedirectPath("/logistics/quote?cargo=B2C"), "/auth/login?next=%2Flogistics%2Fquote%3Fcargo%3DB2C");
assert.equal(getSafeAuthReturnPath("?next=%2Flogistics%2Ftracking"), "/logistics/tracking");
assert.equal(getSafeAuthReturnPath("?next=https%3A%2F%2Fevil.example"), "/account/profile");
assert.equal(getSafeAuthReturnPath("?next=//evil.example"), "/account/profile");
