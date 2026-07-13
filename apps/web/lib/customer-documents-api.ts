import type { CustomerDocument } from "@ground/shared";
import { deleteJson, getJson, postJson } from "./api";

export async function listCustomerDocuments(ownerEmail?: string): Promise<CustomerDocument[]> {
  if (!ownerEmail) {
    return [];
  }

  return getJson<CustomerDocument[]>("/customer-documents");
}

export async function saveCustomerDocument(ownerEmail: string | undefined, document: Omit<CustomerDocument, "createdAt" | "updatedAt">) {
  if (!ownerEmail) {
    throw new Error("Login is required to save customer documents.");
  }

  return postJson<CustomerDocument, Omit<CustomerDocument, "createdAt" | "updatedAt">>("/customer-documents", document);
}

export async function deleteCustomerDocument(ownerEmail: string | undefined, id: string) {
  if (!ownerEmail) {
    return;
  }

  await deleteJson<{ ok: boolean }>(`/customer-documents/${encodeURIComponent(id)}`);
}
