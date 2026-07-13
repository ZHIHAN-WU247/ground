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
  try {
    return await getAdminJson<LogisticsPricingRouteConfig[]>("/admin/logistics/pricing/routes");
  } catch {
    return defaultLogisticsPricingRouteConfigs;
  }
}

export async function updateAdminPricingRouteConfig(routeId: LogisticsRouteId, patch: Partial<LogisticsPricingRouteConfig>) {
  return patchAdminJson<LogisticsPricingRouteConfig, Partial<LogisticsPricingRouteConfig>>(
    `/admin/logistics/pricing/routes/${encodeURIComponent(routeId)}`,
    patch
  );
}
