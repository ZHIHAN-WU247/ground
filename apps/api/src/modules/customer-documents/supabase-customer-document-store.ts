import type { CustomerDocument } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  eq(column: string, value: string | boolean): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  delete(): SupabaseQuery<T>;
}

export interface SupabaseCustomerDocumentClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface CustomerDocumentRow {
  id: string;
  owner_email: string | null;
  document_type: string;
  document_no: string;
  file_asset_id: string | null;
  verified_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export class SupabaseCustomerDocumentStore {
  constructor(private readonly client: SupabaseCustomerDocumentClient) {}

  async listDocuments(ownerEmail?: string): Promise<CustomerDocument[]> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner) {
      return [];
    }

    const result = await this.client
      .from<CustomerDocumentRow[]>("customer_documents")
      .select("*")
      .eq("owner_email", normalizedOwner)
      .order("updated_at", { ascending: false });
    this.assertSuccess(result, "Failed to load customer documents from Supabase.");
    return (result.data ?? []).map((row) => this.toDocument(row));
  }

  async saveDocument(ownerEmail: string | undefined, document: CustomerDocument): Promise<CustomerDocument> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner) {
      throw new Error("Owner email is required to save a customer document.");
    }

    const normalized = this.normalizeDocument(document);

    if (this.isUuid(normalized.id)) {
      const updateResult = await this.client
        .from<CustomerDocumentRow>("customer_documents")
        .update(this.toRowPayload(normalizedOwner, normalized))
        .eq("id", normalized.id)
        .eq("owner_email", normalizedOwner)
        .select()
        .maybeSingle();
      this.assertSuccess(updateResult, "Failed to update customer document in Supabase.");

      if (updateResult.data) {
        return this.toDocument(updateResult.data);
      }
    }

    const insertResult = await this.client
      .from<CustomerDocumentRow>("customer_documents")
      .insert(this.toRowPayload(normalizedOwner, { ...normalized, id: "" }))
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to create customer document in Supabase.");
    return this.toDocument(insertResult.data!);
  }

  async deleteDocument(ownerEmail: string | undefined, id: string): Promise<void> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner || !id) {
      return;
    }

    const result = await this.client
      .from<CustomerDocumentRow[]>("customer_documents")
      .delete()
      .eq("id", id)
      .eq("owner_email", normalizedOwner);
    this.assertSuccess(result, "Failed to delete customer document from Supabase.");
  }

  private toRowPayload(ownerEmail: string, document: CustomerDocument) {
    return {
      owner_email: ownerEmail,
      document_type: document.documentType,
      document_no: document.documentNo,
      file_asset_id: document.fileAssetId ?? null,
      verified_at: document.verifiedAt ?? null,
      metadata: document.metadata
    };
  }

  private toDocument(row: CustomerDocumentRow): CustomerDocument {
    return {
      id: row.id,
      documentType: row.document_type,
      documentNo: row.document_no,
      ...(row.file_asset_id ? { fileAssetId: row.file_asset_id } : {}),
      ...(row.verified_at ? { verifiedAt: row.verified_at } : {}),
      metadata: this.metadataObject(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private normalizeDocument(document: CustomerDocument): CustomerDocument {
    return {
      id: document.id?.trim() ?? "",
      documentType: document.documentType.trim(),
      documentNo: document.documentNo.trim(),
      ...(document.fileAssetId ? { fileAssetId: document.fileAssetId } : {}),
      ...(document.verifiedAt ? { verifiedAt: document.verifiedAt } : {}),
      metadata: this.metadataObject(document.metadata),
      createdAt: document.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private normalizeOwnerEmail(ownerEmail?: string) {
    return ownerEmail?.trim().toLowerCase() ?? "";
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
