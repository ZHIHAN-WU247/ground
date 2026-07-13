import { Injectable } from "@nestjs/common";
import { defaultCarrierApiConfigs, type CarrierApiConfig } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseCarrierConfigStore, type SupabaseCarrierConfigClient } from "./supabase-carrier-config-store";

@Injectable()
export class CarrierConfigService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listConfigs(): Promise<CarrierApiConfig[]> {
    if (!this.supabaseService.client) {
      return defaultCarrierApiConfigs;
    }

    const store = this.getStore();
    await store.seedDefaultsIfEmpty();
    return store.listConfigs();
  }

  async getConfig(providerCode: string): Promise<CarrierApiConfig | null> {
    if (!this.supabaseService.client) {
      return defaultCarrierApiConfigs.find((config) => config.providerCode === providerCode) ?? null;
    }

    const store = this.getStore();
    await store.seedDefaultsIfEmpty();
    return store.getConfig(providerCode);
  }

  async updateConfig(providerCode: string, patch: Partial<Omit<CarrierApiConfig, "id" | "providerCode">>): Promise<CarrierApiConfig> {
    const store = this.getStore();
    await store.seedDefaultsIfEmpty();
    return store.updateConfig(providerCode, patch);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for carrier config persistence.");
    }

    return new SupabaseCarrierConfigStore(this.supabaseService.client as unknown as SupabaseCarrierConfigClient);
  }
}
