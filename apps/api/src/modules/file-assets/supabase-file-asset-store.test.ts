import assert from "node:assert/strict";
import { SupabaseFileAssetStore, type SupabaseFileAssetClient } from "./supabase-file-asset-store";

class FakeStorageBucket {
  uploads: Array<{ path: string; bytes: Buffer; contentType: string | undefined; upsert: boolean | undefined }> = [];

  async upload(path: string, bytes: Buffer, options: { contentType?: string; upsert?: boolean }) {
    this.uploads.push({ path, bytes, contentType: options.contentType, upsert: options.upsert });
    return { data: { path }, error: null };
  }
}

class FakeSupabaseQuery {
  private payload?: Record<string, unknown>;

  constructor(private readonly database: FakeSupabaseDatabase) {}

  insert(payload: Record<string, unknown>) {
    this.payload = payload;
    return this;
  }

  select() {
    return this;
  }

  single() {
    return Promise.resolve({ data: this.database.insert(this.payload ?? {}), error: null });
  }
}

class FakeSupabaseDatabase {
  rows: Array<Record<string, unknown>> = [];
  bucket = new FakeStorageBucket();
  createdBuckets: Array<{ id: string; isPublic: boolean }> = [];

  storage = {
    createBucket: async (id: string, options: { public: boolean }) => {
      this.createdBuckets.push({ id, isPublic: options.public });
      return { data: { id }, error: null };
    },
    from: (bucket: string) => {
      assert.equal(bucket, "customer-documents");
      return this.bucket;
    }
  };

  from(table: string) {
    assert.equal(table, "file_assets");
    return new FakeSupabaseQuery(this);
  }

  insert(payload: Record<string, unknown>) {
    const row = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload
    };
    this.rows.push(row);
    return row;
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseFileAssetStore(database as unknown as SupabaseFileAssetClient);

  const asset = await store.uploadPrivateAsset("Customer@Example.com", {
    fileName: "../Passport Scan.pdf",
    mimeType: "application/pdf",
    dataBase64: Buffer.from("passport bytes").toString("base64"),
    purpose: "customer_document",
    relatedEntityType: "customer_document",
    relatedEntityId: "030ed125-052e-47f4-aceb-82db7548e633",
    metadata: { documentType: "passport" }
  });

  assert.equal(database.createdBuckets[0]?.id, "customer-documents");
  assert.equal(database.createdBuckets[0]?.isPublic, false);
  assert.equal(database.bucket.uploads.length, 1);
  assert.match(database.bucket.uploads[0]!.path, /^customer-example-com\/customer_document\/030ed125-052e-47f4-aceb-82db7548e633-/);
  assert.match(database.bucket.uploads[0]!.path, /passport-scan\.pdf$/);
  assert.equal(database.bucket.uploads[0]!.bytes.toString("utf8"), "passport bytes");
  assert.equal(database.bucket.uploads[0]!.contentType, "application/pdf");
  assert.equal(database.bucket.uploads[0]!.upsert, false);

  assert.equal(database.rows[0]?.owner_email, "customer@example.com");
  assert.equal(database.rows[0]?.bucket, "customer-documents");
  assert.equal(database.rows[0]?.object_path, database.bucket.uploads[0]!.path);
  assert.equal(database.rows[0]?.mime_type, "application/pdf");
  assert.equal(database.rows[0]?.size_bytes, 14);
  assert.equal(database.rows[0]?.visibility, "private");
  assert.equal(database.rows[0]?.purpose, "customer_document");
  assert.equal(database.rows[0]?.related_entity_type, "customer_document");
  assert.equal(database.rows[0]?.related_entity_id, "030ed125-052e-47f4-aceb-82db7548e633");
  assert.equal((database.rows[0]?.metadata as Record<string, unknown>).documentType, "passport");

  assert.equal(asset.ownerEmail, "customer@example.com");
  assert.equal(asset.objectPath, database.bucket.uploads[0]!.path);
  assert.equal(asset.sizeBytes, 14);
};

void run();
