import assert from "node:assert/strict";
import { SupabaseFileAssetStore, type SupabaseFileAssetClient } from "./supabase-file-asset-store";

class FakeSupabaseQuery {
  private filters: Record<string, string> = {};

  constructor(private readonly database: FakeSupabaseDatabase) {}

  insert() { return this; }
  select() { return this; }
  limit() { return this; }

  eq(column: string, value: string) {
    this.filters[column] = value;
    return this;
  }

  single() {
    return this.maybeSingle();
  }

  maybeSingle() {
    const data = this.database.rows.find((row) => Object.entries(this.filters).every(([key, value]) => String(row[key]) === value)) ?? null;
    return Promise.resolve({ data, error: null });
  }
}

class FakeStorageBucket {
  signedUrlRequests: Array<{ path: string; expiresIn: number }> = [];

  async upload() {
    return { data: { path: "" }, error: null };
  }

  async createSignedUrl(path: string, expiresIn: number) {
    this.signedUrlRequests.push({ path, expiresIn });
    return { data: { signedUrl: `https://signed.example/${path}?expires=${expiresIn}` }, error: null };
  }
}

class FakeSupabaseDatabase {
  bucket = new FakeStorageBucket();
  rows: Array<Record<string, unknown>> = [
    {
      id: "030ed125-052e-47f4-aceb-82db7548e633",
      owner_email: "customer@example.com",
      bucket: "customer-documents",
      object_path: "customer/document.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      visibility: "private",
      purpose: "customer_document",
      related_entity_type: "customer_document",
      related_entity_id: "6c319af4-aab8-485c-9d92-fb7ec05d32b7",
      metadata: {},
      created_at: new Date().toISOString()
    }
  ];

  storage = {
    createBucket: async () => ({ data: { id: "customer-documents" }, error: null }),
    from: (bucket: string) => {
      assert.equal(bucket, "customer-documents");
      return this.bucket;
    }
  };

  from(table: string) {
    assert.equal(table, "file_assets");
    return new FakeSupabaseQuery(this);
  }
}

const run = async () => {
  const database = new FakeSupabaseDatabase();
  const store = new SupabaseFileAssetStore(database as unknown as SupabaseFileAssetClient);

  const result = await store.createSignedUrlForAsset("030ed125-052e-47f4-aceb-82db7548e633", 180);

  assert.equal(result.asset.id, "030ed125-052e-47f4-aceb-82db7548e633");
  assert.equal(result.asset.ownerEmail, "customer@example.com");
  assert.equal(result.signedUrl, "https://signed.example/customer/document.pdf?expires=180");
  assert.equal(result.expiresIn, 180);
  assert.deepEqual(database.bucket.signedUrlRequests, [{ path: "customer/document.pdf", expiresIn: 180 }]);
};

void run();
