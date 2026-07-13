import type { CarrierApiConfig } from "@ground/shared";
import { defaultCarrierApiConfigs } from "@ground/shared";
import { getAdminJson, patchAdminJson } from "./api";

export async function listAdminCarrierConfigs(): Promise<CarrierApiConfig[]> {
  try {
    return await getAdminJson<CarrierApiConfig[]>("/admin/logistics/carrier/configs");
  } catch {
    return defaultCarrierApiConfigs;
  }
}

export async function updateAdminCarrierConfig(providerCode: string, patch: Partial<Omit<CarrierApiConfig, "id" | "providerCode">>) {
  return patchAdminJson<CarrierApiConfig, Partial<Omit<CarrierApiConfig, "id" | "providerCode">>>(
    `/admin/logistics/carrier/configs/${encodeURIComponent(providerCode)}`,
    patch
  );
}
