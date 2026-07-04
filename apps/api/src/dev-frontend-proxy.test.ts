import assert from "node:assert/strict";

import { getFrontendProxyDecision } from "./dev-frontend-proxy";

const htmlHeaders = {
  accept: "text/html,application/xhtml+xml"
};

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/", headers: htmlHeaders }), {
  kind: "redirect",
  location: "/auth/login"
});

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/auth/login", headers: htmlHeaders }), {
  kind: "proxy"
});

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/admin/logistics/orders", headers: htmlHeaders }), {
  kind: "proxy"
});

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/_next/static/chunk.js", headers: { accept: "*/*" } }), {
  kind: "proxy"
});

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/admin/logistics/orders", headers: { accept: "*/*" } }), {
  kind: "api"
});

assert.deepEqual(getFrontendProxyDecision({ method: "GET", url: "/docs", headers: htmlHeaders }), {
  kind: "api"
});

assert.deepEqual(getFrontendProxyDecision({ method: "POST", url: "/logistics/orders", headers: htmlHeaders }), {
  kind: "api"
});
