import type { LogisticsPricingRouteConfig, LogisticsRouteId } from "@ground/shared";
import { defaultLogisticsPricingRouteConfigs } from "@ground/shared";
import { getAdminJson, getJson, patchAdminJson } from "./api";

export async function listPricingRouteConfigs(): Promise<LogisticsPricingRouteConfig[]> {
  try {
    return await getJson<LogisticsPricingRouteConfig[]>("/logistics/pricing/routes");
  } catch {
    return defaultLogisticsPricingRouteConfigs;
  }
}

export async function listAdminPricingRouteConfigs(): Promise<LogisticsPricingRouteConfig[]> {
  return getAdminJson<LogisticsPricingRouteConfig[]>("/admin/logistics/pricing/routes");
}

export async function updateAdminPricingRouteConfig(routeId: LogisticsRouteId, patch: Partial<LogisticsPricingRouteConfig>) {
  return patchAdminJson<LogisticsPricingRouteConfig, Partial<LogisticsPricingRouteConfig>>(
    `/admin/logistics/pricing/routes/${encodeURIComponent(routeId)}`,
    toAdminPricingRouteConfigPatch(patch)
  );
}

export function toAdminPricingRouteConfigPatch(config: Partial<LogisticsPricingRouteConfig>): Partial<LogisticsPricingRouteConfig> {
  return {
    ...(config.deliveryMethod !== undefined ? { deliveryMethod: config.deliveryMethod } : {}),
    ...(config.labelKey !== undefined ? { labelKey: config.labelKey } : {}),
    ...(config.noteKey !== undefined ? { noteKey: config.noteKey } : {}),
    ...(config.currency !== undefined ? { currency: config.currency } : {}),
    ...(config.isActive !== undefined ? { isActive: config.isActive } : {}),
    ...(config.formula !== undefined ? { formula: config.formula } : {}),
    ...(config.sortOrder !== undefined ? { sortOrder: config.sortOrder } : {}),
    ...(config.halfKgUnit !== undefined ? { halfKgUnit: config.halfKgUnit } : {}),
    ...(config.baseAmount !== undefined ? { baseAmount: config.baseAmount } : {}),
    ...(config.stepAmount !== undefined ? { stepAmount: config.stepAmount } : {}),
    ...(config.firstMileCnyPerKg !== undefined ? { firstMileCnyPerKg: config.firstMileCnyPerKg } : {}),
    ...(config.perKgAmount !== undefined ? { perKgAmount: config.perKgAmount } : {}),
    ...(config.rubPerCny !== undefined ? { rubPerCny: config.rubPerCny } : {})
  };
}
