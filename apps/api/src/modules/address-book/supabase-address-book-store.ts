import type { AddressBookEntry, AddressBookKind } from "./address-book.types";

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
  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  delete(): SupabaseQuery<T>;
}

export interface SupabaseAddressBookClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface AddressBookRow {
  id: string;
  owner_email: string;
  kind: AddressBookKind;
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

export class SupabaseAddressBookStore {
  constructor(private readonly client: SupabaseAddressBookClient) {}

  async listEntries(ownerEmail?: string, kind?: AddressBookKind): Promise<AddressBookEntry[]> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner) {
      return [];
    }

    let query = this.client
      .from<AddressBookRow[]>("recipient_addresses")
      .select("*")
      .eq("owner_email", normalizedOwner)
      .order("updated_at", { ascending: false });

    if (kind) {
      query = query.eq("kind", kind);
    }

    const result = await query;
    this.assertSuccess(result, "Failed to load address book entries from Supabase.");
    return (result.data ?? [])
      .map((row) => this.toEntry(row))
      .sort((current, next) => Number(next.isDefault) - Number(current.isDefault) || next.updatedAt.localeCompare(current.updatedAt));
  }

  async saveEntry(ownerEmail: string | undefined, entry: AddressBookEntry): Promise<AddressBookEntry> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner) {
      throw new Error("Owner email is required to save an address book entry.");
    }

    const normalizedEntry = this.normalizeEntry(entry);

    if (normalizedEntry.isDefault) {
      await this.clearDefault(normalizedOwner, normalizedEntry.kind, normalizedEntry.id);
    }

    if (this.isUuid(normalizedEntry.id)) {
      const updateResult = await this.client
        .from<AddressBookRow>("recipient_addresses")
        .update(this.toRowPayload(normalizedOwner, normalizedEntry))
        .eq("id", normalizedEntry.id)
        .eq("owner_email", normalizedOwner)
        .select()
        .maybeSingle();
      this.assertSuccess(updateResult, "Failed to update address book entry in Supabase.");

      if (updateResult.data) {
        return this.toEntry(updateResult.data);
      }
    }

    const insertResult = await this.client
      .from<AddressBookRow>("recipient_addresses")
      .insert(this.toRowPayload(normalizedOwner, { ...normalizedEntry, id: "" }))
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to create address book entry in Supabase.");
    return this.toEntry(insertResult.data!);
  }

  async deleteEntry(ownerEmail: string | undefined, id: string): Promise<void> {
    const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwner || !id) {
      return;
    }

    const result = await this.client
      .from<AddressBookRow[]>("recipient_addresses")
      .delete()
      .eq("id", id)
      .eq("owner_email", normalizedOwner);
    this.assertSuccess(result, "Failed to delete address book entry from Supabase.");
  }

  private async clearDefault(ownerEmail: string, kind: AddressBookKind, exceptId: string) {
    const result = await this.client
      .from<AddressBookRow[]>("recipient_addresses")
      .select("*")
      .eq("owner_email", ownerEmail)
      .eq("kind", kind);
    this.assertSuccess(result, "Failed to load existing default address book entries.");

    for (const row of result.data ?? []) {
      if (row.id === exceptId || !this.readIsDefault(row.metadata)) {
        continue;
      }

      const updateResult = await this.client
        .from<AddressBookRow>("recipient_addresses")
        .update({ metadata: { ...this.metadataObject(row.metadata), is_default: false } })
        .eq("id", row.id)
        .eq("owner_email", ownerEmail);
      this.assertSuccess(updateResult, "Failed to clear default address book entry.");
    }
  }

  private toRowPayload(ownerEmail: string, entry: AddressBookEntry) {
    return {
      owner_email: ownerEmail,
      kind: entry.kind,
      label: entry.label,
      name: entry.name,
      phone: entry.phone,
      email: entry.email || null,
      country: entry.country,
      province: entry.province,
      city: entry.city,
      postal_code: entry.postalCode,
      address_line: entry.addressLine,
      location_code: entry.locationCode || null,
      fias_guid: entry.fiasGuid || null,
      metadata: {
        is_default: entry.isDefault
      }
    };
  }

  private toEntry(row: AddressBookRow): AddressBookEntry {
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
      isDefault: this.readIsDefault(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private normalizeEntry(entry: AddressBookEntry): AddressBookEntry {
    const normalized: AddressBookEntry = {
      ...entry,
      id: entry.id?.trim() ?? "",
      label: entry.label.trim(),
      name: entry.name.trim(),
      phone: entry.phone.trim(),
      country: entry.country.trim(),
      province: entry.province.trim(),
      city: entry.city.trim(),
      postalCode: entry.postalCode.trim(),
      addressLine: entry.addressLine.trim(),
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const email = entry.email?.trim();
    const locationCode = entry.locationCode?.trim();
    const fiasGuid = entry.fiasGuid?.trim();

    return {
      ...normalized,
      ...(email ? { email } : {}),
      ...(locationCode ? { locationCode } : {}),
      ...(fiasGuid ? { fiasGuid } : {})
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private readIsDefault(value: unknown) {
    return this.metadataObject(value).is_default === true;
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
