import assert from "node:assert/strict";
import { SupabaseAdminCustomerStore, type SupabaseAdminCustomerClient } from "./supabase-admin-customer-store";

type TableName = "user_profiles" | "recipient_addresses" | "customer_documents" | "file_assets" | "shop_orders" | "logistics_orders";

class FakeSupabaseQuery {
  private filters: Array<{ column: string; value: string }> = [];
  private updatePayload: Record<string, unknown> | null = null;
  private insertPayload: Record<string, unknown> | null = null;
  private shouldDelete = false;

  constructor(private readonly database: FakeSupabaseDatabase, private readonly table: TableName) {}

  select() { return this; }
  order() { return this; }
  limit() { return this; }
  eq(column: string, value: string) {
    this.filters.push({ column, value });
    return this;
  }
  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }
  insert(payload: Record<string, unknown>) {
    this.insertPayload = payload;
    return this;
  }
  delete() {
    this.shouldDelete = true;
    return this;
  }
  async single() {
    const rows = this.getRows();

    if (this.insertPayload) {
      const row = {
        id: "9c319af4-aab8-485c-9d92-fb7ec05d32b7",
        created_at: "2026-01-08T00:00:00.000Z",
        updated_at: "2026-01-08T00:00:00.000Z",
        ...this.insertPayload
      };
      this.database.rows[this.table].push(row);
      return { data: row, error: null };
    }

    if (this.updatePayload) {
      const row = rows[0];

      if (!row) {
        return { data: null, error: { message: "No row" } };
      }

      Object.assign(row, this.updatePayload, { updated_at: "2026-01-08T00:00:00.000Z" });
      return { data: row, error: null };
    }

    return { data: rows[0] ?? null, error: null };
  }
  async maybeSingle() { return this.single(); }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    if (this.shouldDelete) {
      const rows = this.getRows();
      this.database.rows[this.table] = this.database.rows[this.table].filter((row) => !rows.includes(row));
      return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
    }

    if (this.updatePayload) {
      for (const row of this.getRows()) {
        Object.assign(row, this.updatePayload, { updated_at: "2026-01-08T00:00:00.000Z" });
      }
    }

    return Promise.resolve({ data: this.getRows(), error: null }).then(onfulfilled, onrejected);
  }

  private getRows() {
    return this.database.rows[this.table].filter((row) => this.filters.every((filter) => row[filter.column] === filter.value));
  }
}

class FakeSupabaseDatabase {
  rows: Record<TableName, Array<Record<string, unknown>>> = {
    user_profiles: [
      {
        id: "030ed125-052e-47f4-aceb-82db7548e633",
        email: "Customer@Example.com",
        display_name: "Ivan Petrov",
        role: "customer",
        metadata: { phone: "+7000", country: "Russia", city: "Moscow" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z"
      },
      {
        id: "130ed125-052e-47f4-aceb-82db7548e633",
        email: "other@example.com",
        display_name: "Other Customer",
        role: "customer",
        metadata: { phone: "+8000", country: "China", city: "Shanghai" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z"
      }
    ],
    recipient_addresses: [
      {
        id: "6c319af4-aab8-485c-9d92-fb7ec05d32b7",
        owner_email: "customer@example.com",
        kind: "recipient",
        label: "Home",
        name: "Ivan",
        phone: "+7000",
        email: "ivan@example.com",
        country: "Russia",
        province: "Moscow",
        city: "Moscow",
        postal_code: "101000",
        address_line: "Tverskaya 1",
        location_code: "44",
        fias_guid: null,
        metadata: { is_default: true },
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-04T00:00:00.000Z"
      }
    ],
    customer_documents: [
      {
        id: "7b319af4-aab8-485c-9d92-fb7ec05d32b7",
        owner_email: "customer@example.com",
        document_type: "passport",
        document_no: "P-1",
        file_asset_id: "8b319af4-aab8-485c-9d92-fb7ec05d32b7",
        verified_at: null,
        metadata: { holderName: "Ivan Petrov" },
        created_at: "2026-01-05T00:00:00.000Z",
        updated_at: "2026-01-06T00:00:00.000Z"
      }
    ],
    file_assets: [
      {
        id: "8b319af4-aab8-485c-9d92-fb7ec05d32b7",
        owner_email: "customer@example.com",
        bucket: "customer-documents",
        object_path: "customer/passport.pdf",
        mime_type: "application/pdf",
        size_bytes: 512,
        visibility: "private",
        purpose: "customer_document",
        related_entity_type: "customer_document",
        related_entity_id: "7b319af4-aab8-485c-9d92-fb7ec05d32b7",
        metadata: {},
        created_at: "2026-01-07T00:00:00.000Z"
      }
    ],
    shop_orders: [
      {
        id: "1d319af4-aab8-485c-9d92-fb7ec05d32b7",
        owner_email: "customer@example.com",
        order_no: "SO-1",
        status: "CONFIRMED",
        total_amount: 99,
        currency: "USD",
        logistics_order_id: "2d319af4-aab8-485c-9d92-fb7ec05d32b7",
        logistics_reference_no: "LO-1",
        created_at: "2026-01-08T00:00:00.000Z"
      }
    ],
    logistics_orders: [
      {
        id: "2d319af4-aab8-485c-9d92-fb7ec05d32b7",
        owner_email: "customer@example.com",
        order_no: "LO-1",
        cargo_type: "B2C",
        route_id: "air-cdek",
        delivery_method: "TO_DOOR",
        status: "APPROVED",
        review_state: "APPROVED",
        goods_name: "Shoes",
        weight_kg: 1.5,
        tracking_no: "TRACK-1",
        carrier_name: "CDEK",
        created_at: "2026-01-09T00:00:00.000Z"
      }
    ]
  };

  from(table: TableName) {
    return new FakeSupabaseQuery(this, table);
  }
}

const run = async () => {
  const store = new SupabaseAdminCustomerStore(new FakeSupabaseDatabase() as unknown as SupabaseAdminCustomerClient);
  const result = await store.listCustomers();
  const customers = result.items;
  const customer = customers.find((item) => item.email === "customer@example.com");

  assert.equal(customers.length, 2);
  assert.equal(result.total, 2);
  assert.equal(customer?.profile?.name, "Ivan Petrov");
  assert.equal(customer?.addresses.length, 1);
  assert.equal(customer?.addresses[0]?.label, "Home");
  assert.equal(customer?.documents.length, 1);
  assert.equal(customer?.documents[0]?.fileAssetId, "8b319af4-aab8-485c-9d92-fb7ec05d32b7");
  assert.equal(customer?.fileAssets.length, 1);
  assert.equal(customer?.summary.addressCount, 1);
  assert.equal(customer?.summary.documentCount, 1);
  assert.equal(customer?.summary.fileAssetCount, 1);
  assert.equal(customer?.shopOrders.length, 1);
  assert.equal(customer?.shopOrders[0]?.orderNo, "SO-1");
  assert.equal(customer?.logisticsOrders.length, 1);
  assert.equal(customer?.logisticsOrders[0]?.orderNo, "LO-1");
  assert.equal(customer?.summary.shopOrderCount, 1);
  assert.equal(customer?.summary.logisticsOrderCount, 1);

  const reviewed = await store.reviewDocument("customer@example.com", "7b319af4-aab8-485c-9d92-fb7ec05d32b7", {
    status: "approved",
    note: "Passport matches account profile.",
    reviewedBy: "admin@ground.local"
  });

  assert.ok(reviewed.documents[0]?.verifiedAt);
  assert.equal(reviewed.documents[0]?.metadata.review_status, "approved");
  assert.equal(reviewed.documents[0]?.metadata.review_note, "Passport matches account profile.");
  assert.equal(reviewed.documents[0]?.metadata.reviewed_by, "admin@ground.local");

  const searched = await store.listCustomers({ search: "ivan", page: 1, limit: 10 });
  assert.equal(searched.total, 1);
  assert.equal(searched.items[0]?.email, "customer@example.com");

  const paged = await store.listCustomers({ page: 2, limit: 1 });
  assert.equal(paged.total, 2);
  assert.equal(paged.items.length, 1);
  assert.equal(paged.page, 2);
  assert.equal(paged.limit, 1);

  const withOrders = await store.listCustomers({ hasOrders: "true" });
  assert.equal(withOrders.total, 1);
  assert.equal(withOrders.items[0]?.email, "customer@example.com");

  const approvedDocuments = await store.listCustomers({ documentReviewStatus: "approved" });
  assert.equal(approvedDocuments.total, 1);
  assert.equal(approvedDocuments.items[0]?.email, "customer@example.com");

  const riskUpdated = await store.updateRiskProfile("customer@example.com", {
    adminNote: "Manual review before high value shipments.",
    tags: ["vip", "address-check"],
    riskLevel: "high",
    isBlacklisted: true,
    restrictionReason: "Chargeback investigation",
    followUpAt: "2026-02-01T00:00:00.000Z"
  });

  assert.equal(riskUpdated.riskProfile.adminNote, "Manual review before high value shipments.");
  assert.deepEqual(riskUpdated.riskProfile.tags, ["vip", "address-check"]);
  assert.equal(riskUpdated.riskProfile.riskLevel, "high");
  assert.equal(riskUpdated.riskProfile.isBlacklisted, true);
  assert.equal(riskUpdated.riskProfile.restrictionReason, "Chargeback investigation");
  assert.equal(riskUpdated.riskProfile.followUpAt, "2026-02-01T00:00:00.000Z");
  assert.equal(riskUpdated.profile?.phone, "+7000");

  const savedAddress = await store.saveAddress("customer@example.com", {
    id: "",
    label: "Office",
    kind: "recipient",
    name: "Ivan Office",
    phone: "+7111",
    email: "office@example.com",
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101001",
    addressLine: "Office Street 2",
    isDefault: true
  });

  assert.equal(savedAddress.addresses.length, 2);
  assert.equal(savedAddress.addresses.find((address) => address.label === "Home")?.isDefault, false);
  assert.equal(savedAddress.addresses.find((address) => address.label === "Office")?.isDefault, true);

  const deletedAddress = await store.deleteAddress("customer@example.com", "9c319af4-aab8-485c-9d92-fb7ec05d32b7");

  assert.equal(deletedAddress.addresses.length, 1);
  assert.equal(deletedAddress.addresses[0]?.label, "Home");
};

void run();
