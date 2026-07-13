import { Injectable } from "@nestjs/common";
import type { CustomerDocument } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseCustomerDocumentStore, type SupabaseCustomerDocumentClient } from "./supabase-customer-document-store";

@Injectable()
export class CustomerDocumentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDocuments(ownerEmail?: string): Promise<CustomerDocument[]> {
    return this.getStore().listDocuments(ownerEmail);
  }

  async saveDocument(ownerEmail: string | undefined, input: Omit<CustomerDocument, "createdAt" | "updatedAt"> & Partial<Pick<CustomerDocument, "createdAt" | "updatedAt">>): Promise<CustomerDocument> {
    return this.getStore().saveDocument(ownerEmail, {
      createdAt: "",
      updatedAt: "",
      ...input,
      metadata: input.metadata ?? {}
    });
  }

  async deleteDocument(ownerEmail: string | undefined, id: string): Promise<void> {
    return this.getStore().deleteDocument(ownerEmail, id);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for customer document persistence.");
    }

    return new SupabaseCustomerDocumentStore(this.supabaseService.client as unknown as SupabaseCustomerDocumentClient);
  }
}
