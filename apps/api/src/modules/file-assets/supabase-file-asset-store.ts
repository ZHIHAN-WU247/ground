import type { FileAsset } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string; statusCode?: string } | null;
}

interface SupabaseQuery<T> {
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  select(columns?: string): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
}

interface SupabaseStorageBucket {
  upload(path: string, body: Buffer, options: { contentType?: string; upsert?: boolean }): Promise<SupabaseResult<{ path: string }>>;
  createSignedUrl(path: string, expiresIn: number): Promise<SupabaseResult<{ signedUrl: string }>>;
}

interface SupabaseStorageClient {
  createBucket(id: string, options: { public: boolean }): Promise<SupabaseResult<{ id: string }>>;
  from(bucket: string): SupabaseStorageBucket;
}

export interface SupabaseFileAssetClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
  storage: SupabaseStorageClient;
}

interface FileAssetRow {
  id: string;
  owner_email: string | null;
  bucket: string;
  object_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: "public" | "private";
  purpose: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: unknown;
  created_at: string;
}

export interface UploadPrivateAssetInput {
  bucket?: string;
  fileName: string;
  mimeType?: string;
  dataBase64: string;
  purpose: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export interface FileAssetSignedUrlResult {
  asset: FileAsset;
  signedUrl: string;
  expiresIn: number;
}

export class SupabaseFileAssetStore {
  private readonly defaultPrivateBucket = "customer-documents";

  constructor(private readonly client: SupabaseFileAssetClient) {}

  async uploadPrivateAsset(ownerEmail: string | undefined, input: UploadPrivateAssetInput): Promise<FileAsset> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner) {
      throw new Error("Owner email is required to upload a private file.");
    }

    const bucket = input.bucket?.trim() || this.defaultPrivateBucket;
    const bytes = Buffer.from(input.dataBase64, "base64");
    const objectPath = this.buildObjectPath(normalizedOwner, input);

    await this.ensurePrivateBucket(bucket);

    const uploadResult = await this.client.storage.from(bucket).upload(objectPath, bytes, {
      contentType: input.mimeType?.trim() || "application/octet-stream",
      upsert: false
    });
    this.assertSuccess(uploadResult, "Failed to upload private file to Supabase Storage.");

    const insertResult = await this.client
      .from<FileAssetRow>("file_assets")
      .insert({
        owner_email: normalizedOwner,
        bucket,
        object_path: objectPath,
        mime_type: input.mimeType?.trim() || null,
        size_bytes: bytes.byteLength,
        visibility: "private",
        purpose: input.purpose.trim(),
        related_entity_type: input.relatedEntityType?.trim() || null,
        related_entity_id: input.relatedEntityId?.trim() || null,
        metadata: this.metadataObject(input.metadata)
      })
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to save private file metadata to Supabase.");
    return this.toAsset(insertResult.data!);
  }

  async getAsset(id: string): Promise<FileAsset | null> {
    const result = await this.client
      .from<FileAssetRow>("file_assets")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load file asset from Supabase.");
    return result.data ? this.toAsset(result.data) : null;
  }

  async createSignedUrlForAsset(id: string, expiresIn = 300): Promise<FileAssetSignedUrlResult> {
    const asset = await this.getAsset(id);

    if (!asset) {
      throw new Error("File asset was not found.");
    }

    const result = await this.client.storage.from(asset.bucket).createSignedUrl(asset.objectPath, expiresIn);
    this.assertSuccess(result, "Failed to create Supabase Storage signed URL.");
    return {
      asset,
      signedUrl: result.data!.signedUrl,
      expiresIn
    };
  }

  private async ensurePrivateBucket(bucket: string) {
    const result = await this.client.storage.createBucket(bucket, { public: false });

    if (result.error && !this.isExistingBucketError(result.error.message)) {
      throw new Error(result.error.message || "Failed to create private Supabase Storage bucket.");
    }
  }

  private buildObjectPath(ownerEmail: string, input: UploadPrivateAssetInput) {
    const ownerSegment = this.slugify(ownerEmail.replace("@", "-"));
    const purposeSegment = this.slugify(input.purpose || "private-file");
    const entitySegment = input.relatedEntityId?.trim() || crypto.randomUUID();
    const fileSegment = this.sanitizeFileName(input.fileName);
    return `${ownerSegment}/${purposeSegment}/${entitySegment}-${crypto.randomUUID()}-${fileSegment}`;
  }

  private sanitizeFileName(fileName: string) {
    const baseName = fileName.split(/[\\/]/).pop()?.trim() || "upload.bin";
    const normalized = baseName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return normalized || "upload.bin";
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private toAsset(row: FileAssetRow): FileAsset {
    return {
      id: row.id,
      ...(row.owner_email ? { ownerEmail: row.owner_email } : {}),
      bucket: row.bucket,
      objectPath: row.object_path,
      ...(row.mime_type ? { mimeType: row.mime_type } : {}),
      sizeBytes: row.size_bytes ?? 0,
      visibility: row.visibility,
      purpose: row.purpose,
      ...(row.related_entity_type ? { relatedEntityType: row.related_entity_type } : {}),
      ...(row.related_entity_id ? { relatedEntityId: row.related_entity_id } : {}),
      metadata: this.metadataObject(row.metadata),
      createdAt: row.created_at
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

  private isExistingBucketError(message?: string) {
    return Boolean(message?.toLowerCase().includes("already exists"));
  }
}
