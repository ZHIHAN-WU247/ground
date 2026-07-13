import "reflect-metadata";
import assert from "node:assert/strict";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { LogisticsController } from "./logistics.controller";

class FakeLogisticsService {
  calls: Array<{ method: string; ownerEmail: string | undefined; value?: unknown }> = [];

  createQuote(input: unknown) { return input; }
  listPricingRouteConfigs() { return []; }
  listRegionConfigs() { return []; }

  createOrder(input: { ownerEmail?: string }) {
    this.calls.push({ method: "create", ownerEmail: input.ownerEmail, value: input });
    return input;
  }

  listOrders(ownerEmail?: string) {
    this.calls.push({ method: "list", ownerEmail });
    return [];
  }

  getOrder(id: string, ownerEmail?: string) {
    this.calls.push({ method: "get", ownerEmail, value: id });
    return { id };
  }
}

const run = async () => {
  for (const method of ["createOrder", "listOrders", "getOrder"] as const) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, LogisticsController.prototype[method]) ?? [];
    assert.ok(guards.includes(SupabaseTokenGuard), `${method} must require Supabase auth.`);
  }

  const service = new FakeLogisticsService();
  const controller = new LogisticsController(service as never);
  const request = { user: { id: "user-1", email: "owner@example.com", role: "customer" } };

  await (controller.createOrder as (...args: unknown[]) => unknown)(request, { ownerEmail: "attacker@example.com", cargoType: "B2C" });
  await (controller.listOrders as (...args: unknown[]) => unknown)(request, "attacker@example.com");
  await (controller.getOrder as (...args: unknown[]) => unknown)("order-1", request);

  assert.deepEqual(service.calls, [
    { method: "create", ownerEmail: "owner@example.com", value: { ownerEmail: "owner@example.com", cargoType: "B2C" } },
    { method: "list", ownerEmail: "owner@example.com" },
    { method: "get", ownerEmail: "owner@example.com", value: "order-1" }
  ]);
};

void run();
