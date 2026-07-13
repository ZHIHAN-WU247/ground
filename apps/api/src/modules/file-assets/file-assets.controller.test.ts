import "reflect-metadata";
import assert from "node:assert/strict";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { FileAssetsController } from "./file-assets.controller";

class FakeFileAssetsService {
  calls: Array<{ id: string; ownerEmail: string | undefined; expiresIn: number }> = [];
  uploadCalls: Array<{ ownerEmail: string | undefined; input: unknown }> = [];

  uploadPrivateAsset(ownerEmail: string | undefined, input: unknown) {
    this.uploadCalls.push({ ownerEmail, input });
    return { id: "asset-1" };
  }

  createOwnerSignedUrl(id: string, ownerEmail: string | undefined, expiresIn: number) {
    this.calls.push({ id, ownerEmail, expiresIn });
    return { signedUrl: "https://signed.example/file", expiresIn };
  }
}

const run = async () => {
  for (const method of ["uploadPrivateAsset", "createOwnerSignedUrl"] as const) {
    const guards = Reflect.getMetadata(GUARDS_METADATA, FileAssetsController.prototype[method]) ?? [];
    assert.ok(guards.includes(SupabaseTokenGuard), `${method} must require Supabase auth.`);
  }

  const service = new FakeFileAssetsService();
  const controller = new FileAssetsController(service as never);
  const request = { user: { id: "user-1", email: "owner@example.com", role: "customer" } };

  await (controller.uploadPrivateAsset as (...args: unknown[]) => unknown)(request, {
    ownerEmail: "attacker@example.com",
    fileName: "passport.pdf",
    dataBase64: "ZmlsZQ==",
    purpose: "customer_document"
  });
  await (controller.createOwnerSignedUrl as (...args: unknown[]) => unknown)("asset-1", request, "600", "attacker@example.com");

  assert.equal(service.uploadCalls[0]?.ownerEmail, "owner@example.com");
  assert.deepEqual(service.calls, [{ id: "asset-1", ownerEmail: "owner@example.com", expiresIn: 600 }]);
};

void run();
