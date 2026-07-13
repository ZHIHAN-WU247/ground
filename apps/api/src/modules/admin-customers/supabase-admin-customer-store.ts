import type {
  AddressContact,
  AdminCustomerAddress,
  AdminCustomerAddressInput,
  AdminCustomerLogisticsOrderSummary,
  AdminCustomerListQuery,
  AdminCustomerListResult,
  AdminCustomerOverview,
  AdminCustomerProfileUpdate,
  AdminCustomerRiskProfile,
  AdminCustomerShopOrderSummary,
  CustomerDocument,
  CustomerDocumentReviewStatus,
  FileAsset
} from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  single(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  delete(): SupabaseQuery<T>;
}

export interface SupabaseAdminCustomerClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
  auth: {
    admin: {
      listUsers(options?: { page?: number; perPage?: number }): Promise<SupabaseAuthListUsersResult>;
      createUser(input: { email: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }): Promise<SupabaseAuthCreateUserResult>;
    };
  };
}

export interface ReviewCustomerDocumentInput {
  status: CustomerDocumentReviewStatus;
  note?: string;
  reviewedBy?: string;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

interface SupabaseAuthListUsersResult {
  data: { users: SupabaseAuthUser[] } | null;
  error: { message?: string } | null;
}

interface SupabaseAuthCreateUserResult {
  data: { user: SupabaseAuthUser | null } | null;
  error: { message?: string } | null;
}

interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "customer" | "admin";
  metadata: unknown;
}

interface AddressRow {
  id: string;
  owner_email: string;
  kind: "sender" | "recipient";
  label: string;
  name: string;
  phone: string;
  email: string | null;
  country: string;
  province: string;
  city: string;
  postal_code: string;
  address_line: string;
  location_code: string | null;
  fias_guid: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
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

interface ShopOrderRow {
  id: string;
  owner_email: string | null;
  order_no: string;
  status: AdminCustomerShopOrderSummary["status"];
  total_amount: number | string;
  currency: AdminCustomerShopOrderSummary["currency"];
  logistics_order_id: string | null;
  logistics_reference_no: string | null;
  created_at: string;
}

interface LogisticsOrderRow {
  id: string;
  owner_email: string | null;
  order_no: string;
  cargo_type: AdminCustomerLogisticsOrderSummary["cargoType"];
  route_id: AdminCustomerLogisticsOrderSummary["routeId"] | null;
  delivery_method: AdminCustomerLogisticsOrderSummary["deliveryMethod"];
  status: AdminCustomerLogisticsOrderSummary["status"];
  review_state: AdminCustomerLogisticsOrderSummary["reviewState"];
  goods_name: string;
  weight_kg: number | string;
  tracking_no: string | null;
  carrier_name: string | null;
  created_at: string;
}

export class SupabaseAdminCustomerStore {
  constructor(private readonly client: SupabaseAdminCustomerClient) {}

  async listCustomers(query: AdminCustomerListQuery = {}): Promise<AdminCustomerListResult> {
    const page = this.normalizePositiveInteger(query.page, 1);
    const limit = Math.min(this.normalizePositiveInteger(query.limit, 20), 100);
    const filtered = this.filterCustomers(await this.listAllCustomers(), query);
    const start = (page - 1) * limit;

    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit
    };
  }

  private async listAllCustomers(): Promise<AdminCustomerOverview[]> {
    const [profileRows, addressRows, documentRows, fileAssetRows, shopOrderRows, logisticsOrderRows] = await Promise.all([
      this.selectRows<UserProfileRow>("user_profiles", "email"),
      this.selectRows<AddressRow>("recipient_addresses", "updated_at"),
      this.selectRows<DocumentRow>("customer_documents", "updated_at"),
      this.selectRows<FileAssetRow>("file_assets", "created_at"),
      this.selectRows<ShopOrderRow>("shop_orders", "created_at"),
      this.selectRows<LogisticsOrderRow>("logistics_orders", "created_at")
    ]);

    const emails = new Set<string>();
    profileRows.forEach((row) => this.addEmail(emails, row.email));
    addressRows.forEach((row) => this.addEmail(emails, row.owner_email));
    documentRows.forEach((row) => this.addEmail(emails, row.owner_email ?? ""));
    fileAssetRows.forEach((row) => this.addEmail(emails, row.owner_email ?? ""));
    shopOrderRows.forEach((row) => this.addEmail(emails, row.owner_email ?? ""));
    logisticsOrderRows.forEach((row) => this.addEmail(emails, row.owner_email ?? ""));

    return Array.from(emails)
      .sort()
      .map((email) => {
        const profile = profileRows.find((row) => this.normalizeEmail(row.email) === email);
        const addresses = addressRows.filter((row) => this.normalizeEmail(row.owner_email) === email).map((row) => this.toAddress(row));
        const documents = documentRows.filter((row) => this.normalizeEmail(row.owner_email ?? "") === email).map((row) => this.toDocument(row));
        const fileAssets = fileAssetRows.filter((row) => this.normalizeEmail(row.owner_email ?? "") === email).map((row) => this.toFileAsset(row));
        const shopOrders = shopOrderRows.filter((row) => this.normalizeEmail(row.owner_email ?? "") === email).map((row) => this.toShopOrderSummary(row));
        const logisticsOrders = logisticsOrderRows.filter((row) => this.normalizeEmail(row.owner_email ?? "") === email).map((row) => this.toLogisticsOrderSummary(row));

        return {
          email,
          ...(profile ? { profile: this.toProfile(profile) } : {}),
          riskProfile: this.toRiskProfile(profile?.metadata),
          addresses,
          documents,
          fileAssets,
          shopOrders,
          logisticsOrders,
          summary: {
            addressCount: addresses.length,
            documentCount: documents.length,
            fileAssetCount: fileAssets.length,
            shopOrderCount: shopOrders.length,
            logisticsOrderCount: logisticsOrders.length
          }
        };
      });
  }

  async getCustomer(email: string): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Customer email is required.");
    }

    const customer = (await this.listAllCustomers()).find((item) => item.email === normalizedEmail);

    if (!customer) {
      throw new Error("Customer was not found.");
    }

    return customer;
  }

  async updateProfile(email: string, input: AdminCustomerProfileUpdate): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Customer email is required.");
    }

    const existing = await this.findProfileRowByEmail(normalizedEmail);
    const userId = existing?.id ?? await this.findOrCreateAuthUser(normalizedEmail, input.name);
    const payload = this.toProfilePayload(normalizedEmail, input);

    if (existing) {
      const updateResult = await this.client
        .from<UserProfileRow>("user_profiles")
        .update(payload)
        .eq("id", userId)
        .select()
        .single();
      this.assertSuccess(updateResult, "Failed to update customer profile in Supabase.");
    } else {
      const insertResult = await this.client
        .from<UserProfileRow>("user_profiles")
        .insert({ id: userId, ...payload, role: "customer" })
        .select()
        .single();
      this.assertSuccess(insertResult, "Failed to create customer profile in Supabase.");
    }

    return this.getCustomer(normalizedEmail);
  }

  async updateRiskProfile(email: string, input: AdminCustomerRiskProfile): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Customer email is required.");
    }

    const existing = await this.findProfileRowByEmail(normalizedEmail);

    if (!existing) {
      throw new Error("Customer profile was not found.");
    }

    const metadata = {
      ...this.metadataObject(existing.metadata),
      admin_note: input.adminNote.trim(),
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      risk_level: input.riskLevel,
      is_blacklisted: input.isBlacklisted,
      restriction_reason: input.restrictionReason.trim(),
      ...(input.followUpAt?.trim() ? { follow_up_at: input.followUpAt.trim() } : { follow_up_at: null })
    };
    const result = await this.client
      .from<UserProfileRow>("user_profiles")
      .update({ metadata })
      .eq("id", existing.id)
      .select()
      .single();
    this.assertSuccess(result, "Failed to update customer risk profile in Supabase.");

    return this.getCustomer(normalizedEmail);
  }

  async reviewDocument(email: string, documentId: string, input: ReviewCustomerDocumentInput): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedDocumentId = documentId.trim();

    if (!normalizedEmail || !normalizedDocumentId) {
      throw new Error("Customer email and document id are required.");
    }

    const existing = await this.findDocumentRow(normalizedEmail, normalizedDocumentId);

    if (!existing) {
      throw new Error("Customer document was not found.");
    }

    const reviewedAt = new Date().toISOString();
    const metadata = {
      ...this.metadataObject(existing.metadata),
      review_status: input.status,
      review_note: input.note?.trim() ?? "",
      reviewed_at: reviewedAt,
      ...(input.reviewedBy ? { reviewed_by: input.reviewedBy } : {})
    };
    const result = await this.client
      .from<DocumentRow>("customer_documents")
      .update({
        verified_at: input.status === "approved" ? reviewedAt : null,
        metadata
      })
      .eq("id", normalizedDocumentId)
      .eq("owner_email", normalizedEmail)
      .select()
      .single();
    this.assertSuccess(result, "Failed to review customer document in Supabase.");

    return this.getCustomer(normalizedEmail);
  }

  async saveAddress(email: string, input: AdminCustomerAddressInput): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);
    const normalized = this.normalizeAddressInput(input);

    if (!normalizedEmail) {
      throw new Error("Customer email is required.");
    }

    if (normalized.isDefault) {
      await this.clearDefaultAddress(normalizedEmail, normalized.kind, normalized.id);
    }

    if (this.isUuid(normalized.id)) {
      const updateResult = await this.client
        .from<AddressRow>("recipient_addresses")
        .update(this.toAddressPayload(normalizedEmail, normalized))
        .eq("id", normalized.id)
        .eq("owner_email", normalizedEmail)
        .select()
        .maybeSingle();
      this.assertSuccess(updateResult, "Failed to update customer address in Supabase.");

      if (updateResult.data) {
        return this.getCustomer(normalizedEmail);
      }
    }

    const insertResult = await this.client
      .from<AddressRow>("recipient_addresses")
      .insert(this.toAddressPayload(normalizedEmail, { ...normalized, id: "" }))
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to create customer address in Supabase.");

    return this.getCustomer(normalizedEmail);
  }

  async deleteAddress(email: string, addressId: string): Promise<AdminCustomerOverview> {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedAddressId = addressId.trim();

    if (!normalizedEmail || !normalizedAddressId) {
      throw new Error("Customer email and address id are required.");
    }

    const result = await this.client
      .from<AddressRow[]>("recipient_addresses")
      .delete()
      .eq("id", normalizedAddressId)
      .eq("owner_email", normalizedEmail);
    this.assertSuccess(result, "Failed to delete customer address from Supabase.");

    return this.getCustomer(normalizedEmail);
  }

  private async selectRows<T>(table: string, orderColumn: string): Promise<T[]> {
    const result = await this.client.from<T[]>(table).select("*").order(orderColumn, { ascending: false });
    this.assertSuccess(result, `Failed to load ${table} from Supabase.`);
    return result.data ?? [];
  }

  private async findProfileRowByEmail(email: string): Promise<UserProfileRow | null> {
    const result = await this.client
      .from<UserProfileRow>("user_profiles")
      .select("*")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load customer profile from Supabase.");

    if (result.data) {
      return result.data;
    }

    const fallbackResult = await this.client
      .from<UserProfileRow[]>("user_profiles")
      .select("*");
    this.assertSuccess(fallbackResult, "Failed to load customer profile from Supabase.");
    return (fallbackResult.data ?? []).find((row) => this.normalizeEmail(row.email) === email) ?? null;
  }

  private async findOrCreateAuthUser(email: string, displayName: string): Promise<string> {
    const usersResult = await this.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    this.assertAuthSuccess(usersResult, "Failed to list Supabase auth users.");

    const existing = usersResult.data?.users.find((user) => this.normalizeEmail(user.email ?? "") === email);

    if (existing) {
      return existing.id;
    }

    const createResult = await this.client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: displayName
      }
    });
    this.assertAuthSuccess(createResult, "Failed to create Supabase auth user.");

    if (!createResult.data?.user?.id) {
      throw new Error("Supabase auth user was not created.");
    }

    return createResult.data.user.id;
  }

  private async findDocumentRow(email: string, documentId: string): Promise<DocumentRow | null> {
    const result = await this.client
      .from<DocumentRow>("customer_documents")
      .select("*")
      .eq("id", documentId)
      .eq("owner_email", email)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load customer document from Supabase.");
    return result.data ?? null;
  }

  private async clearDefaultAddress(email: string, kind: "sender" | "recipient", exceptId: string) {
    const result = await this.client
      .from<AddressRow[]>("recipient_addresses")
      .select("*")
      .eq("owner_email", email)
      .eq("kind", kind);
    this.assertSuccess(result, "Failed to load customer addresses from Supabase.");

    for (const row of result.data ?? []) {
      if (row.id === exceptId || this.metadataObject(row.metadata).is_default !== true) {
        continue;
      }

      const updateResult = await this.client
        .from<AddressRow>("recipient_addresses")
        .update({ metadata: { ...this.metadataObject(row.metadata), is_default: false } })
        .eq("id", row.id)
        .eq("owner_email", email);
      this.assertSuccess(updateResult, "Failed to clear default customer address in Supabase.");
    }
  }

  private toProfile(row: UserProfileRow): AddressContact {
    const metadata = this.metadataObject(row.metadata);
    const locationCode = this.asString(metadata.location_code);
    const fiasGuid = this.asString(metadata.fias_guid);

    return {
      name: row.display_name ?? "",
      phone: this.asString(metadata.phone),
      email: this.normalizeEmail(row.email),
      country: this.asString(metadata.country) || "China",
      province: this.asString(metadata.province),
      city: this.asString(metadata.city),
      postalCode: this.asString(metadata.postal_code),
      addressLine: this.asString(metadata.address_line),
      ...(locationCode ? { locationCode } : {}),
      ...(fiasGuid ? { fiasGuid } : {})
    };
  }

  private toRiskProfile(value: unknown): AdminCustomerRiskProfile {
    const metadata = this.metadataObject(value);
    const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === "string") : [];
    const riskLevel = this.asString(metadata.risk_level);
    const followUpAt = this.asString(metadata.follow_up_at);

    return {
      adminNote: this.asString(metadata.admin_note),
      tags,
      riskLevel: riskLevel === "medium" || riskLevel === "high" ? riskLevel : "low",
      isBlacklisted: metadata.is_blacklisted === true,
      restrictionReason: this.asString(metadata.restriction_reason),
      ...(followUpAt ? { followUpAt } : {})
    };
  }

  private toAddress(row: AddressRow): AdminCustomerAddress {
    return {
      id: row.id,
      label: row.label,
      kind: row.kind,
      name: row.name,
      phone: row.phone,
      ...(row.email ? { email: row.email } : {}),
      country: row.country,
      province: row.province,
      city: row.city,
      postalCode: row.postal_code,
      addressLine: row.address_line,
      ...(row.location_code ? { locationCode: row.location_code } : {}),
      ...(row.fias_guid ? { fiasGuid: row.fias_guid } : {}),
      isDefault: this.metadataObject(row.metadata).is_default === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private toDocument(row: DocumentRow): CustomerDocument {
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

  private toFileAsset(row: FileAssetRow): FileAsset {
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

  private toShopOrderSummary(row: ShopOrderRow): AdminCustomerShopOrderSummary {
    return {
      id: row.id,
      orderNo: row.order_no,
      status: row.status,
      totalAmount: Number(row.total_amount),
      currency: row.currency,
      ...(row.logistics_order_id ? { logisticsOrderId: row.logistics_order_id } : {}),
      ...(row.logistics_reference_no ? { logisticsReferenceNo: row.logistics_reference_no } : {}),
      createdAt: row.created_at
    };
  }

  private toLogisticsOrderSummary(row: LogisticsOrderRow): AdminCustomerLogisticsOrderSummary {
    return {
      id: row.id,
      orderNo: row.order_no,
      status: row.status,
      reviewState: row.review_state,
      cargoType: row.cargo_type,
      ...(row.route_id ? { routeId: row.route_id } : {}),
      deliveryMethod: row.delivery_method,
      goodsName: row.goods_name,
      weightKg: Number(row.weight_kg),
      ...(row.tracking_no ? { trackingNo: row.tracking_no } : {}),
      ...(row.carrier_name ? { carrierName: row.carrier_name } : {}),
      createdAt: row.created_at
    };
  }

  private filterCustomers(customers: AdminCustomerOverview[], query: AdminCustomerListQuery) {
    const search = query.search?.trim().toLowerCase() ?? "";
    const documentStatus = query.documentReviewStatus && query.documentReviewStatus !== "all" ? query.documentReviewStatus : "";
    const hasOrders = query.hasOrders && query.hasOrders !== "all" ? query.hasOrders : "";

    return customers.filter((customer) => {
      if (search && !this.customerMatchesSearch(customer, search)) {
        return false;
      }

      if (documentStatus && !this.customerMatchesDocumentStatus(customer, documentStatus)) {
        return false;
      }

      if (hasOrders) {
        const orderCount = customer.summary.shopOrderCount + customer.summary.logisticsOrderCount;
        if (hasOrders === "true" && orderCount === 0) {
          return false;
        }

        if (hasOrders === "false" && orderCount > 0) {
          return false;
        }
      }

      return true;
    });
  }

  private customerMatchesSearch(customer: AdminCustomerOverview, search: string) {
    const profile = customer.profile;
    const haystack = [
      customer.email,
      profile?.name ?? "",
      profile?.phone ?? "",
      profile?.city ?? "",
      ...customer.addresses.flatMap((address) => [address.label, address.name, address.phone, address.email ?? "", address.city, address.addressLine]),
      ...customer.documents.flatMap((document) => [document.documentType, document.documentNo]),
      ...customer.shopOrders.map((order) => order.orderNo),
      ...customer.logisticsOrders.flatMap((order) => [order.orderNo, order.trackingNo ?? "", order.goodsName])
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  }

  private customerMatchesDocumentStatus(customer: AdminCustomerOverview, status: string) {
    if (status === "pending") {
      return customer.documents.length === 0 || customer.documents.some((document) => !this.asString(document.metadata.review_status));
    }

    return customer.documents.some((document) => this.asString(document.metadata.review_status) === status);
  }

  private normalizePositiveInteger(value: number | undefined, fallback: number) {
    if (!Number.isFinite(value) || !value || value < 1) {
      return fallback;
    }

    return Math.floor(value);
  }

  private toProfilePayload(email: string, input: AdminCustomerProfileUpdate) {
    const locationCode = input.locationCode?.trim();
    const fiasGuid = input.fiasGuid?.trim();

    return {
      email,
      display_name: input.name.trim(),
      metadata: {
        phone: input.phone.trim(),
        country: input.country.trim() || "China",
        province: input.province.trim(),
        city: input.city.trim(),
        postal_code: input.postalCode.trim(),
        address_line: input.addressLine.trim(),
        ...(locationCode ? { location_code: locationCode } : {}),
        ...(fiasGuid ? { fias_guid: fiasGuid } : {})
      }
    };
  }

  private toAddressPayload(email: string, input: AdminCustomerAddressInput) {
    return {
      owner_email: email,
      kind: input.kind,
      label: input.label,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      country: input.country,
      province: input.province,
      city: input.city,
      postal_code: input.postalCode,
      address_line: input.addressLine,
      location_code: input.locationCode || null,
      fias_guid: input.fiasGuid || null,
      metadata: {
        is_default: input.isDefault
      }
    };
  }

  private normalizeAddressInput(input: AdminCustomerAddressInput): AdminCustomerAddressInput {
    const email = input.email?.trim();
    const locationCode = input.locationCode?.trim();
    const fiasGuid = input.fiasGuid?.trim();

    return {
      id: input.id?.trim() ?? "",
      label: input.label.trim(),
      kind: input.kind,
      name: input.name.trim(),
      phone: input.phone.trim(),
      ...(email ? { email } : {}),
      country: input.country.trim(),
      province: input.province.trim(),
      city: input.city.trim(),
      postalCode: input.postalCode.trim(),
      addressLine: input.addressLine.trim(),
      ...(locationCode ? { locationCode } : {}),
      ...(fiasGuid ? { fiasGuid } : {}),
      isDefault: input.isDefault
    };
  }

  private addEmail(emails: Set<string>, email: string) {
    const normalized = this.normalizeEmail(email);
    if (normalized) {
      emails.add(normalized);
    }
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private assertAuthSuccess<T extends { error: { message?: string } | null }>(result: T, fallback: string): asserts result is T & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
