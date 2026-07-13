import assert from "node:assert/strict";

import { getAdminNavHref } from "./site-chrome-navigation";

assert.equal(getAdminNavHref(false), "/admin/login?next=%2Fadmin");
assert.equal(getAdminNavHref(true), "/admin");
