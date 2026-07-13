import type { AddressContact } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

interface SupabaseListUsersResult {
  data: { users: SupabaseAuthUser[] } | null;
  error: { message?: string } | null;
}

interface SupabaseCreateUserResult {
  data: { user: SupabaseAuthUser | null } | null;
  error: { message?: string } | null;
}

export interface SupabaseUserProfileClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
  auth: {
    admin: {
      listUsers(options?: { page?: number; perPage?: number }): Promise<SupabaseListUsersResult>;
      createUser(input: { email: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }): Promise<SupabaseCreateUserResult>;
    };
  };
}

interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "customer" | "admin";
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export class SupabaseUserProfileStore {
  constructor(private readonly client: SupabaseUserProfileClient) {}

  async findByEmail(email: string | undefined): Promise<AddressContact | null> {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    const result = await this.client
      .from<UserProfileRow>("user_profiles")
      .select("*")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load user profile from Supabase.");
    return result.data ? this.toProfile(result.data) : null;
  }

  async saveProfile(profile: AddressContact): Promise<AddressContact> {
    const normalized = this.normalizeProfile(profile);

    if (!normalized.email) {
      throw new Error("Email is required to save a user profile.");
    }

    let existing = await this.findProfileRowByEmail(normalized.email);
    const userId = existing?.id ?? await this.findOrCreateAuthUser(normalized);
    const payload = this.toRowPayload(normalized);
    existing = existing ?? await this.findProfileRowById(userId);

    if (existing) {
      const updateResult = await this.client
        .from<UserProfileRow>("user_profiles")
        .update(payload)
        .eq("id", userId)
        .select()
        .single();
      this.assertSuccess(updateResult, "Failed to update user profile in Supabase.");
      return this.toProfile(updateResult.data!);
    }

    const insertResult = await this.client
      .from<UserProfileRow>("user_profiles")
      .insert({ id: userId, ...payload, role: "customer" })
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to create user profile in Supabase.");
    return this.toProfile(insertResult.data!);
  }

  private async findProfileRowByEmail(email: string): Promise<UserProfileRow | null> {
    const result = await this.client
      .from<UserProfileRow>("user_profiles")
      .select("*")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load user profile from Supabase.");
    return result.data ?? null;
  }

  private async findProfileRowById(id: string): Promise<UserProfileRow | null> {
    const result = await this.client
      .from<UserProfileRow>("user_profiles")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load user profile from Supabase.");
    return result.data ?? null;
  }

  private async findOrCreateAuthUser(profile: AddressContact): Promise<string> {
    const usersResult = await this.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    this.assertAuthSuccess(usersResult, "Failed to list Supabase auth users.");

    const email = profile.email as string;
    const existing = usersResult.data?.users.find((user) => this.normalizeEmail(user.email) === email);

    if (existing) {
      return existing.id;
    }

    const createResult = await this.client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: profile.name
      }
    });
    this.assertAuthSuccess(createResult, "Failed to create Supabase auth user.");

    if (!createResult.data?.user?.id) {
      throw new Error("Supabase auth user was not created.");
    }

    return createResult.data.user.id;
  }

  private toRowPayload(profile: AddressContact) {
    return {
      email: profile.email,
      display_name: profile.name,
      metadata: {
        phone: profile.phone,
        country: profile.country,
        province: profile.province,
        city: profile.city,
        postal_code: profile.postalCode,
        address_line: profile.addressLine,
        ...(profile.locationCode ? { location_code: profile.locationCode } : {}),
        ...(profile.fiasGuid ? { fias_guid: profile.fiasGuid } : {})
      }
    };
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

  private normalizeProfile(profile: AddressContact): AddressContact {
    const email = this.normalizeEmail(profile.email);
    const locationCode = profile.locationCode?.trim();
    const fiasGuid = profile.fiasGuid?.trim();

    return {
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      ...(email ? { email } : {}),
      country: profile.country.trim() || "China",
      province: profile.province.trim(),
      city: profile.city.trim(),
      postalCode: profile.postalCode.trim(),
      addressLine: profile.addressLine.trim(),
      ...(locationCode ? { locationCode } : {}),
      ...(fiasGuid ? { fiasGuid } : {})
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private normalizeEmail(email?: string) {
    return email?.trim().toLowerCase() ?? "";
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
}
