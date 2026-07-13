import { BadRequestException } from "@nestjs/common";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> {
  select(columns?: string): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  maybeSingle(): Promise<SupabaseResult<T>>;
}

export interface SupabaseCustomerRiskClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface UserProfileRiskRow {
  email: string;
  metadata: unknown;
}

export class SupabaseCustomerRiskGuard {
  constructor(private readonly client: SupabaseCustomerRiskClient) {}

  async assertCanCreateOrder(ownerEmail?: string): Promise<void> {
    const email = ownerEmail?.trim().toLowerCase();

    if (!email) {
      return;
    }

    const result = await this.client
      .from<UserProfileRiskRow>("user_profiles")
      .select("email, metadata")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message || "Failed to load customer risk profile from Supabase.");
    }

    const metadata = this.metadataObject(result.data?.metadata);

    if (metadata.is_blacklisted === true) {
      const reason = this.asString(metadata.restriction_reason) || "Account is restricted.";
      throw new BadRequestException(`Account restricted: ${reason}`);
    }
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
  }
}
