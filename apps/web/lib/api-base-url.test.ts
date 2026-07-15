import assert from "node:assert/strict";
import { resolveApiBaseUrl } from "./api";

assert.equal(
  resolveApiBaseUrl("http://localhost:4102", { hostname: "localhost", protocol: "http:" }),
  "http://localhost:4102"
);

assert.equal(
  resolveApiBaseUrl("http://localhost:4102", { hostname: "192.168.1.2", protocol: "http:" }),
  "http://192.168.1.2:4102"
);

assert.equal(
  resolveApiBaseUrl("http://127.0.0.1:4102", { hostname: "ground.example.com", protocol: "https:" }),
  "https://ground.example.com:4102"
);

assert.equal(
  resolveApiBaseUrl("https://api.example.com", { hostname: "192.168.1.2", protocol: "http:" }),
  "https://api.example.com"
);
