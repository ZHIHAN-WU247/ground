import { defaultLogisticsRegionConfigs, type LogisticsRegionCityConfig, type LogisticsRegionCountryConfig } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean; foreignTable?: string }): SupabaseQuery<T>;
  eq(column: string, value: string | boolean): SupabaseQuery<T>;
  limit(count: number): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
}

export interface SupabaseRegionConfigClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface CityRow {
  id: string;
  country_id: string;
  name: string;
  region: string | null;
  postal_code_hint: string | null;
  location_code: string | null;
  fias_guid: string | null;
  is_active: boolean;
  metadata: unknown;
  created_at: string;
}

interface CountryRow {
  id: string;
  iso_code: string;
  name: string;
  is_active: boolean;
  metadata: unknown;
  created_at: string;
  cities?: CityRow[];
}

export class SupabaseRegionConfigStore {
  constructor(private readonly client: SupabaseRegionConfigClient) {}

  async seedDefaultsIfEmpty(): Promise<void> {
    const result = await this.client.from<CountryRow[]>("countries").select("*, cities(*)");
    this.assertSuccess(result, "Failed to check region config in Supabase.");
    const existingCountries = result.data ?? [];

    for (const config of defaultLogisticsRegionConfigs) {
      let country = existingCountries.find((row) => row.iso_code === config.isoCode);

      if (!country) {
        const created = await this.client.from<CountryRow>("countries").insert(this.toCountryPayload(config)).select().single();
        this.assertSuccess(created, "Failed to create country in Supabase.");
        country = { ...created.data!, cities: [] };
        existingCountries.push(country);
      }

      for (const city of config.cities) {
        if (country.cities?.some((row) => row.name === city.name)) {
          continue;
        }

        const cityResult = await this.client.from<CityRow>("cities").insert(this.toCityPayload(country.id, city)).select().single();
        this.assertSuccess(cityResult, "Failed to create city in Supabase.");
        country.cities = [...(country.cities ?? []), cityResult.data!];
      }
    }
  }

  async listRegions(): Promise<LogisticsRegionCountryConfig[]> {
    const result = await this.client
      .from<CountryRow[]>("countries")
      .select("*, cities(*)")
      .order("created_at", { ascending: true })
      .order("created_at", { foreignTable: "cities", ascending: true });
    this.assertSuccess(result, "Failed to load region config from Supabase.");

    const regions = (result.data ?? []).map((row) => this.toCountry(row));
    return regions.length > 0 ? regions : defaultLogisticsRegionConfigs;
  }

  async updateCountry(isoCode: string, patch: Partial<Pick<LogisticsRegionCountryConfig, "isActive" | "name">>): Promise<LogisticsRegionCountryConfig> {
    const country = await this.findCountryByIsoCode(isoCode);

    if (!country) {
      throw new Error("Country config was not found.");
    }

    const result = await this.client
      .from<CountryRow>("countries")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {})
      })
      .eq("id", country.id)
      .select("*, cities(*)")
      .single();
    this.assertSuccess(result, "Failed to update country config in Supabase.");
    return this.toCountry(result.data!);
  }

  async updateCity(cityId: string, patch: Partial<LogisticsRegionCityConfig>): Promise<LogisticsRegionCityConfig> {
    const result = await this.client
      .from<CityRow>("cities")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.region !== undefined ? { region: patch.region } : {}),
        ...(patch.postalCodeHint !== undefined ? { postal_code_hint: patch.postalCodeHint } : {}),
        ...(patch.locationCode !== undefined ? { location_code: patch.locationCode || null } : {}),
        ...(patch.fiasGuid !== undefined ? { fias_guid: patch.fiasGuid || null } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {})
      })
      .eq("id", cityId)
      .select()
      .single();
    this.assertSuccess(result, "Failed to update city config in Supabase.");
    const country = await this.findCountryById(result.data!.country_id);
    return this.toCity(result.data!, country?.iso_code ?? "");
  }

  private async findCountryByIsoCode(isoCode: string): Promise<CountryRow | null> {
    const result = await this.client.from<CountryRow>("countries").select("*, cities(*)").eq("iso_code", isoCode).limit(1).maybeSingle();
    this.assertSuccess(result, "Failed to load country config from Supabase.");
    return result.data ?? null;
  }

  private async findCountryById(id: string): Promise<CountryRow | null> {
    const result = await this.client.from<CountryRow>("countries").select("*").eq("id", id).limit(1).maybeSingle();
    this.assertSuccess(result, "Failed to load country config from Supabase.");
    return result.data ?? null;
  }

  private toCountryPayload(config: LogisticsRegionCountryConfig) {
    return {
      iso_code: config.isoCode,
      name: config.name,
      is_active: config.isActive,
      metadata: {}
    };
  }

  private toCityPayload(countryId: string, config: LogisticsRegionCityConfig) {
    return {
      country_id: countryId,
      name: config.name,
      region: config.region || null,
      postal_code_hint: config.postalCodeHint || null,
      location_code: config.locationCode || null,
      fias_guid: config.fiasGuid || null,
      is_active: config.isActive,
      metadata: {}
    };
  }

  private toCountry(row: CountryRow): LogisticsRegionCountryConfig {
    return {
      id: row.id,
      isoCode: row.iso_code,
      name: row.name,
      isActive: row.is_active,
      cities: (row.cities ?? []).map((city) => this.toCity(city, row.iso_code))
    };
  }

  private toCity(row: CityRow, countryIsoCode: string): LogisticsRegionCityConfig {
    return {
      id: row.id,
      countryIsoCode,
      name: row.name,
      region: row.region ?? "",
      postalCodeHint: row.postal_code_hint ?? "",
      ...(row.location_code ? { locationCode: row.location_code } : {}),
      ...(row.fias_guid ? { fiasGuid: row.fias_guid } : {}),
      isActive: row.is_active
    };
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }
}
