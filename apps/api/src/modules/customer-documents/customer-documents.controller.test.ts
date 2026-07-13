import "reflect-metadata";
import assert from "node:assert/strict";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { CustomerDocumentsController } from "./customer-documents.controller";

class FakeCustomerDocumentsService {
  calls: Array<{ method: string; ownerEmail: string | undefined; value?: unknown }> = [];

  listDocuments(ownerEmail: string | undefined) {
    this.calls.push({ method: "list", ownerEmail });
    return [];
  }

  saveDocument(ownerEmail: string | undefined, document: unknown) {
    this.calls.push({ method: "save", ownerEmail, value: document });
    return document;
  }

  deleteDocument(ownerEmail: string | undefined, id: string) {
    this.calls.push({ method: "delete", ownerEmail, value: id });
  }
}

const run = async () => {
  for (const method of ["listDocuments", "saveDocument", "deleteDocument"] as const) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CustomerDocumentsController.prototype[method]) ?? [];
    assert.ok(guards.includes(SupabaseTokenGuard), `${method} must require Supabase auth.`);
  }

  const service = new FakeCustomerDocumentsService();
  const controller = new CustomerDocumentsController(service as never);
  const request = { user: { id: "user-1", email: "owner@example.com", role: "customer" } };

  await (controller.listDocuments as (...args: unknown[]) => unknown)(request, "attacker@example.com");
  await (controller.saveDocument as (...args: unknown[]) => unknown)(request, {
    id: "doc-1",
    documentType: "passport",
    documentNo: "P123",
    metadata: { review_status: "approved" }
  }, "attacker@example.com");
  await (controller.deleteDocument as (...args: unknown[]) => unknown)("doc-1", request, "attacker@example.com");

  assert.deepEqual(service.calls, [
    { method: "list", ownerEmail: "owner@example.com" },
    {
      method: "save",
      ownerEmail: "owner@example.com",
      value: {
        id: "doc-1",
        documentType: "passport",
        documentNo: "P123",
        metadata: { review_status: "approved" }
      }
    },
    { method: "delete", ownerEmail: "owner@example.com", value: "doc-1" }
  ]);
};

void run();
