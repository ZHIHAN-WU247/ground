import { defaultCarrierApiConfigs, type CarrierApiConfig } from "@ground/shared";

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
}

export interface SupabaseCarrierConfigClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface CarrierConfigRow {
  id: string;
  provider_code: string;
  display_name: string;
  api_base_url: string | null;
  credential_ref: string | null;
  is_active: boolean;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export class SupabaseCarrierConfigStore {
  constructor(private readonly client: SupabaseCarrierConfigClient) {}

  async seedDefaultsIfEmpty(): Promise<void> {
    const result = await this.client.from<CarrierConfigRow[]>("carrier_configs").select("*");
    this.assertSuccess(result, "Failed to check carrier config in Supabase.");
    const existing = result.data ?? [];

    for (const config of defaultCarrierApiConfigs) {
      const current = existing.find((row) => row.provider_code === config.providerCode);

      if (current) {
        await this.backfillDefaultFields(current, config);
        continue;
      }

      const insertResult = await this.client.from<CarrierConfigRow>("carrier_configs").insert(this.toRowPayload(config)).select().single();
      this.assertSuccess(insertResult, "Failed to create carrier config in Supabase.");
    }
  }

  async listConfigs(): Promise<CarrierApiConfig[]> {
    const result = await this.client.from<CarrierConfigRow[]>("carrier_configs").select("*").order("created_at", { ascending: true });
    this.assertSuccess(result, "Failed to load carrier config from Supabase.");

    const configs = (result.data ?? []).map((row) => this.toConfig(row));
    return configs.length > 0 ? configs : defaultCarrierApiConfigs;
  }

  async getConfig(providerCode: string): Promise<CarrierApiConfig | null> {
    const result = await this.client.from<CarrierConfigRow>("carrier_configs").select("*").eq("provider_code", providerCode).limit(1).maybeSingle();
    this.assertSuccess(result, "Failed to load carrier config from Supabase.");
    return result.data ? this.toConfig(result.data) : null;
  }

  async updateConfig(providerCode: string, patch: Partial<Omit<CarrierApiConfig, "id" | "providerCode">>): Promise<CarrierApiConfig> {
    const current = await this.getConfig(providerCode);

    if (!current) {
      throw new Error("Carrier config was not found.");
    }

    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Omit<CarrierApiConfig, "id" | "providerCode">>;
    const next: CarrierApiConfig = {
      ...current,
      ...cleanPatch,
      providerCode
    };
    const result = await this.client
      .from<CarrierConfigRow>("carrier_configs")
      .update(this.toRowPayload(next))
      .eq("provider_code", providerCode)
      .select()
      .single();
    this.assertSuccess(result, "Failed to update carrier config in Supabase.");
    return this.toConfig(result.data!);
  }

  private async backfillDefaultFields(row: CarrierConfigRow, config: CarrierApiConfig): Promise<void> {
    const metadata = this.metadataObject(row.metadata);
    const patch: Record<string, unknown> = {};

    if (!row.credential_ref && config.credentialRef) {
      patch.credential_ref = config.credentialRef;
    }

    if (Object.keys(metadata).length === 0 && Object.keys(config.metadata).length > 0) {
      patch.metadata = config.metadata;
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    const result = await this.client.from<CarrierConfigRow>("carrier_configs").update(patch).eq("id", row.id);
    this.assertSuccess(result, "Failed to backfill carrier config defaults in Supabase.");
  }

  private toRowPayload(config: CarrierApiConfig) {
    return {
      provider_code: config.providerCode,
      display_name: config.displayName,
      api_base_url: config.apiBaseUrl || null,
      credential_ref: config.credentialRef || null,
      is_active: config.isActive,
      metadata: config.metadata
    };
  }

  private toConfig(row: CarrierConfigRow): CarrierApiConfig {
    return {
      id: row.id,
      providerCode: row.provider_code,
      displayName: row.display_name,
      apiBaseUrl: row.api_base_url ?? "",
      credentialRef: row.credential_ref ?? "",
      isActive: row.is_active,
      metadata: this.metadataObject(row.metadata)
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }
}
