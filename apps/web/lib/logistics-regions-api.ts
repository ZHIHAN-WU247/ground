import type { LogisticsRegionCityConfig, LogisticsRegionCountryConfig } from "@ground/shared";
import { defaultLogisticsRegionConfigs } from "@ground/shared";
import { getAdminJson, getJson, patchAdminJson } from "./api";

export async function listLogisticsRegions(): Promise<LogisticsRegionCountryConfig[]> {
  try {
    return await getJson<LogisticsRegionCountryConfig[]>("/logistics/regions");
  } catch {
    return defaultLogisticsRegionConfigs;
  }
}

export async function listAdminLogisticsRegions(): Promise<LogisticsRegionCountryConfig[]> {
  try {
    return await getAdminJson<LogisticsRegionCountryConfig[]>("/admin/logistics/regions");
  } catch {
    return defaultLogisticsRegionConfigs;
  }
}

export async function updateAdminLogisticsRegionCountry(isoCode: string, patch: Partial<Pick<LogisticsRegionCountryConfig, "isActive" | "name">>) {
  return patchAdminJson<LogisticsRegionCountryConfig, Partial<Pick<LogisticsRegionCountryConfig, "isActive" | "name">>>(
    `/admin/logistics/regions/countries/${encodeURIComponent(isoCode)}`,
    patch
  );
}

export async function updateAdminLogisticsRegionCity(cityId: string, patch: Partial<LogisticsRegionCityConfig>) {
  return patchAdminJson<LogisticsRegionCityConfig, Partial<LogisticsRegionCityConfig>>(
    `/admin/logistics/regions/cities/${encodeURIComponent(cityId)}`,
    patch
  );
}
