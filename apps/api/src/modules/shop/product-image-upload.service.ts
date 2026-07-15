import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SupabaseService } from "../database/supabase.service";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface ProductImageStorageBucket {
  upload(path: string, body: Buffer, options: { contentType?: string; upsert?: boolean }): Promise<SupabaseResult<{ path: string }>>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

interface ProductImageStorageClient {
  createBucket(id: string, options: { public: boolean }): Promise<SupabaseResult<{ id: string }>>;
  from(bucket: string): ProductImageStorageBucket;
}

export interface ProductImageUploadClient {
  storage: ProductImageStorageClient;
}

interface UploadProductImageInput {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class ProductImageUploadService {
  private readonly bucket = "product-images";

  constructor(@Inject(SupabaseService) private readonly supabaseService: { client: unknown }) {}

  async uploadProductImage(input: UploadProductImageInput) {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for product image uploads.");
    }

    if (input.mimeType !== "image/webp") {
      throw new BadRequestException("Product images must be uploaded as WebP.");
    }

    await this.ensurePublicBucket(this.supabaseService.client as unknown as ProductImageUploadClient);

    const objectPath = this.buildObjectPath(input.fileName);
    const storage = (this.supabaseService.client as unknown as ProductImageUploadClient).storage.from(this.bucket);
    const uploadResult = await storage.upload(objectPath, input.bytes, {
      contentType: input.mimeType,
      upsert: false
    });
    this.assertSuccess(uploadResult, "Failed to upload product image to Supabase Storage.");

    const publicUrl = storage.getPublicUrl(objectPath).data.publicUrl;
    return { url: publicUrl };
  }

  private async ensurePublicBucket(client: ProductImageUploadClient) {
    const result = await client.storage.createBucket(this.bucket, { public: true });

    if (result.error && !this.isExistingBucketError(result.error.message)) {
      throw new Error(result.error.message || "Failed to create product image bucket.");
    }
  }

  private buildObjectPath(fileName: string) {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `products/${year}/${month}/${crypto.randomUUID()}-${this.sanitizeFileName(fileName)}`;
  }

  private sanitizeFileName(fileName: string) {
    const baseName = fileName.split(/[\\/]/).pop()?.trim() || "product-image.webp";
    const normalized = baseName
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `${normalized || "product-image"}.webp`;
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
