import { defaultLogisticsPricingRouteConfigs, type CargoType, type CurrencyCode, type LogisticsDeliveryMethod, type LogisticsPricingFormula, type LogisticsPricingRouteConfig, type LogisticsRouteId } from "@ground/shared";

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
  delete(): SupabaseQuery<T>;
}

export interface SupabasePricingConfigClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface PricingRuleRow {
  id: string;
  pricing_table_id: string;
  destination_country: string;
  destination_city: string;
  min_weight_kg: number | string;
  max_weight_kg: number | string | null;
  base_price: number | string;
  per_kg_price: number | string;
  first_mile_price: number | string;
  last_mile_price: number | string;
  volumetric_divisor: number | string;
  metadata: unknown;
  created_at: string;
}

interface PricingTableRow {
  id: string;
  cargo_type: CargoType;
  route_id: LogisticsRouteId;
  delivery_method: LogisticsDeliveryMethod;
  name: string;
  currency: CurrencyCode;
  is_active: boolean;
  template_version: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  pricing_rules?: PricingRuleRow[];
}

export const defaultPricingRouteConfigs = defaultLogisticsPricingRouteConfigs;

export class SupabasePricingConfigStore {
  constructor(private readonly client: SupabasePricingConfigClient) {}

  async seedDefaultsIfEmpty(): Promise<void> {
    const result = await this.client.from<PricingTableRow[]>("pricing_tables").select("*, pricing_rules(*)").eq("cargo_type", "B2C");
    this.assertSuccess(result, "Failed to check pricing config in Supabase.");
    const existingTables = result.data ?? [];

    for (const config of defaultPricingRouteConfigs) {
      const existing = existingTables.find((table) => table.route_id === config.routeId);

      if (!existing) {
        await this.createRouteConfig(config);
        continue;
      }

      if (!existing.pricing_rules?.length) {
        const ruleResult = await this.client.from<PricingRuleRow>("pricing_rules").insert(this.toRulePayload(existing.id, {
          ...config,
          currency: existing.currency,
          isActive: existing.is_active,
          deliveryMethod: existing.delivery_method
        })).select().single();
        this.assertSuccess(ruleResult, "Failed to create missing pricing rule in Supabase.");
      }
    }
  }

  async listRouteConfigs(): Promise<LogisticsPricingRouteConfig[]> {
    const result = await this.client
      .from<PricingTableRow[]>("pricing_tables")
      .select("*, pricing_rules(*)")
      .eq("cargo_type", "B2C")
      .order("created_at", { ascending: true });
    this.assertSuccess(result, "Failed to load pricing config from Supabase.");

    const configs = (result.data ?? [])
      .filter((row) => row.route_id)
      .map((row) => this.toConfig(row));

    return (configs.length > 0 ? configs : defaultPricingRouteConfigs).sort((current, next) => current.sortOrder - next.sortOrder);
  }

  async updateRouteConfig(routeId: LogisticsRouteId, patch: Partial<LogisticsPricingRouteConfig>): Promise<LogisticsPricingRouteConfig> {
    const current = (await this.listRouteConfigs()).find((config) => config.routeId === routeId);

    if (!current) {
      throw new Error("Pricing route config was not found.");
    }

    const next: LogisticsPricingRouteConfig = {
      ...current,
      ...patch,
      routeId,
      cargoType: "B2C"
    };
    const table = await this.findRouteTable(routeId);

    if (!table) {
      return this.createRouteConfig(next);
    }

    const tableResult = await this.client
      .from<PricingTableRow>("pricing_tables")
      .update(this.toTablePayload(next))
      .eq("id", table.id)
      .select()
      .single();
    this.assertSuccess(tableResult, "Failed to update pricing table in Supabase.");

    const rule = table.pricing_rules?.[0];

    if (rule) {
      const ruleResult = await this.client
        .from<PricingRuleRow>("pricing_rules")
        .update(this.toRulePayload(table.id, next))
        .eq("id", rule.id)
        .select()
        .single();
      this.assertSuccess(ruleResult, "Failed to update pricing rule in Supabase.");
    } else {
      const ruleResult = await this.client.from<PricingRuleRow>("pricing_rules").insert(this.toRulePayload(table.id, next)).select().single();
      this.assertSuccess(ruleResult, "Failed to create pricing rule in Supabase.");
    }

    return (await this.listRouteConfigs()).find((config) => config.routeId === routeId) ?? next;
  }

  private async createRouteConfig(config: LogisticsPricingRouteConfig): Promise<LogisticsPricingRouteConfig> {
    const tableResult = await this.client.from<PricingTableRow>("pricing_tables").insert(this.toTablePayload(config)).select().single();
    this.assertSuccess(tableResult, "Failed to create pricing table in Supabase.");
    const tableId = tableResult.data!.id;
    const ruleResult = await this.client.from<PricingRuleRow>("pricing_rules").insert(this.toRulePayload(tableId, config)).select().single();
    this.assertSuccess(ruleResult, "Failed to create pricing rule in Supabase.");
    return config;
  }

  private async findRouteTable(routeId: LogisticsRouteId): Promise<PricingTableRow | null> {
    const result = await this.client
      .from<PricingTableRow>("pricing_tables")
      .select("*, pricing_rules(*)")
      .eq("cargo_type", "B2C")
      .eq("route_id", routeId)
      .limit(1)
      .maybeSingle();
    this.assertSuccess(result, "Failed to load pricing route config from Supabase.");
    return result.data ?? null;
  }

  private toTablePayload(config: LogisticsPricingRouteConfig) {
    return {
      cargo_type: config.cargoType,
      route_id: config.routeId,
      delivery_method: config.deliveryMethod,
      name: config.labelKey,
      currency: config.currency,
      is_active: config.isActive,
      template_version: "route-config-v1",
      metadata: {
        label_key: config.labelKey,
        note_key: config.noteKey,
        sort_order: config.sortOrder
      }
    };
  }

  private toRulePayload(pricingTableId: string, config: LogisticsPricingRouteConfig) {
    return {
      pricing_table_id: pricingTableId,
      destination_country: "Russia",
      destination_city: "*",
      min_weight_kg: 0,
      max_weight_kg: null,
      base_price: config.baseAmount ?? 0,
      per_kg_price: config.perKgAmount ?? 0,
      first_mile_price: config.firstMileCnyPerKg ?? 0,
      last_mile_price: 0,
      volumetric_divisor: 6000,
      metadata: {
        formula: config.formula,
        half_kg_unit: config.halfKgUnit,
        step_price: config.stepAmount ?? 0,
        rub_per_cny: config.rubPerCny ?? 11
      }
    };
  }

  private toConfig(row: PricingTableRow): LogisticsPricingRouteConfig {
    const tableMetadata = this.metadataObject(row.metadata);
    const rule = row.pricing_rules?.[0];
    const ruleMetadata = this.metadataObject(rule?.metadata);
    const fallback = defaultPricingRouteConfigs.find((config) => config.routeId === row.route_id);
    const baseAmount = this.asNumber(rule?.base_price);
    const stepAmount = this.asNumber(ruleMetadata.step_price);
    const firstMileCnyPerKg = this.asNumber(rule?.first_mile_price);
    const perKgAmount = this.asNumber(rule?.per_kg_price);
    const rubPerCny = this.asNumber(ruleMetadata.rub_per_cny);

    return {
      routeId: row.route_id,
      deliveryMethod: row.delivery_method,
      cargoType: row.cargo_type,
      labelKey: this.asString(tableMetadata.label_key) || fallback?.labelKey || row.name,
      noteKey: this.asString(tableMetadata.note_key) || fallback?.noteKey || row.name,
      currency: row.currency,
      isActive: row.is_active,
      formula: this.asFormula(ruleMetadata.formula) ?? fallback?.formula ?? "per_kg",
      sortOrder: this.asNumber(tableMetadata.sort_order) ?? fallback?.sortOrder ?? 99,
      halfKgUnit: this.asNumber(ruleMetadata.half_kg_unit) ?? fallback?.halfKgUnit ?? 0.5,
      ...(baseAmount !== undefined ? { baseAmount } : {}),
      ...(stepAmount !== undefined ? { stepAmount } : {}),
      ...(firstMileCnyPerKg !== undefined ? { firstMileCnyPerKg } : {}),
      ...(perKgAmount !== undefined ? { perKgAmount } : {}),
      ...(rubPerCny !== undefined ? { rubPerCny } : {})
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private asNumber(value: unknown) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private asFormula(value: unknown): LogisticsPricingFormula | undefined {
    return value === "half_kg_step" || value === "cdek_first_last_mile" || value === "per_kg" ? value : undefined;
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }
}
