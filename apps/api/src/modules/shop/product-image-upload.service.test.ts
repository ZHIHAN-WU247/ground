import assert from "node:assert/strict";
import { ProductImageUploadService, type ProductImageUploadClient } from "./product-image-upload.service";

class FakeStorageBucket {
  uploads: Array<{ path: string; bytes: Buffer; contentType: string | undefined; upsert: boolean | undefined }> = [];

  async upload(path: string, bytes: Buffer, options: { contentType?: string; upsert?: boolean }) {
    this.uploads.push({ path, bytes, contentType: options.contentType, upsert: options.upsert });
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string) {
    return { data: { publicUrl: `https://cdn.example.com/storage/v1/object/public/product-images/${path}` } };
  }
}

class FakeSupabaseClient {
  bucket = new FakeStorageBucket();
  createdBuckets: Array<{ id: string; isPublic: boolean }> = [];

  storage = {
    createBucket: async (id: string, options: { public: boolean }) => {
      this.createdBuckets.push({ id, isPublic: options.public });
      return { data: { id }, error: null };
    },
    from: (bucket: string) => {
      assert.equal(bucket, "product-images");
      return this.bucket;
    }
  };
}

const run = async () => {
  const client = new FakeSupabaseClient();
  const service = new ProductImageUploadService({ client: client as unknown as ProductImageUploadClient });

  const result = await service.uploadProductImage({
    bytes: Buffer.from("webp bytes"),
    fileName: "../Cover Image.webp",
    mimeType: "image/webp"
  });

  assert.equal(client.createdBuckets[0]?.id, "product-images");
  assert.equal(client.createdBuckets[0]?.isPublic, true);
  assert.equal(client.bucket.uploads.length, 1);
  assert.match(client.bucket.uploads[0]!.path, /^products\/\d{4}\/\d{2}\//);
  assert.match(client.bucket.uploads[0]!.path, /cover-image\.webp$/);
  assert.equal(client.bucket.uploads[0]!.bytes.toString("utf8"), "webp bytes");
  assert.equal(client.bucket.uploads[0]!.contentType, "image/webp");
  assert.equal(client.bucket.uploads[0]!.upsert, false);
  assert.equal(result.url, `https://cdn.example.com/storage/v1/object/public/product-images/${client.bucket.uploads[0]!.path}`);
};

void run();
