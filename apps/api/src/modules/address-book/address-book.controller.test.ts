import "reflect-metadata";
import assert from "node:assert/strict";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { AddressBookController } from "./address-book.controller";

class FakeAddressBookService {
  calls: Array<{ method: string; ownerEmail: string | undefined; value?: unknown }> = [];

  listEntries(ownerEmail: string | undefined, kind: string | undefined) {
    this.calls.push({ method: "list", ownerEmail, value: kind });
    return [];
  }

  saveEntry(ownerEmail: string | undefined, entry: unknown) {
    this.calls.push({ method: "save", ownerEmail, value: entry });
    return entry;
  }

  deleteEntry(ownerEmail: string | undefined, id: string) {
    this.calls.push({ method: "delete", ownerEmail, value: id });
  }
}

const run = async () => {
  for (const method of ["listEntries", "saveEntry", "deleteEntry"] as const) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AddressBookController.prototype[method]) ?? [];
    assert.ok(guards.includes(SupabaseTokenGuard), `${method} must require Supabase auth.`);
  }

  const service = new FakeAddressBookService();
  const controller = new AddressBookController(service as never);
  const request = { user: { id: "user-1", email: "owner@example.com", role: "customer" } };

  await (controller.listEntries as (...args: unknown[]) => unknown)(request, "recipient", "attacker@example.com");
  await (controller.saveEntry as (...args: unknown[]) => unknown)(request, { ownerEmail: "attacker@example.com", entry: { id: "addr-1" } });
  await (controller.deleteEntry as (...args: unknown[]) => unknown)("addr-1", request, "attacker@example.com");

  assert.deepEqual(service.calls, [
    { method: "list", ownerEmail: "owner@example.com", value: "recipient" },
    { method: "save", ownerEmail: "owner@example.com", value: { id: "addr-1" } },
    { method: "delete", ownerEmail: "owner@example.com", value: "addr-1" }
  ]);
};

void run();
