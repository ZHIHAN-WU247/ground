import "reflect-metadata";
import assert from "node:assert/strict";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { ShopController } from "./shop.controller";

class FakeShopService {
  calls: Array<{ method: string; ownerEmail: string | undefined; value?: unknown }> = [];

  listProducts() { return []; }
  getProduct(slug: string) { return { slug }; }

  listOrders(ownerEmail?: string) {
    this.calls.push({ method: "list", ownerEmail });
    return [];
  }

  getOrder(id: string, ownerEmail?: string) {
    this.calls.push({ method: "get", ownerEmail, value: id });
    return { id };
  }

  createOrder(input: { ownerEmail?: string }) {
    this.calls.push({ method: "create", ownerEmail: input.ownerEmail, value: input });
    return input;
  }
}

const run = async () => {
  for (const method of ["listOrders", "getOrder", "createOrder"] as const) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ShopController.prototype[method]) ?? [];
    assert.ok(guards.includes(SupabaseTokenGuard), `${method} must require Supabase auth.`);
  }

  const service = new FakeShopService();
  const controller = new ShopController(service as never);
  const request = { user: { id: "user-1", email: "owner@example.com", role: "customer" } };

  await (controller.listOrders as (...args: unknown[]) => unknown)(request, "attacker@example.com");
  await (controller.getOrder as (...args: unknown[]) => unknown)("order-1", request, "attacker@example.com");
  await (controller.createOrder as (...args: unknown[]) => unknown)(request, { ownerEmail: "attacker@example.com", items: [], recipient: {} });

  assert.deepEqual(service.calls, [
    { method: "list", ownerEmail: "owner@example.com" },
    { method: "get", ownerEmail: "owner@example.com", value: "order-1" },
    { method: "create", ownerEmail: "owner@example.com", value: { ownerEmail: "owner@example.com", items: [], recipient: {} } }
  ]);
};

void run();
