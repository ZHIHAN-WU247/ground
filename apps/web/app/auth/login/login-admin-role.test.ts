import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/web/app/auth/login/LoginForm.tsx", "utf8");

assert.equal(source.includes("isSupabaseAdminSession"), false);
assert.equal(source.includes("clearSupabaseAuthSession"), false);
assert.equal(source.includes("管理员账号请从后台登录入口登录"), false);
