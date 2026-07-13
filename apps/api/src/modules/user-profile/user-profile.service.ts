import { Injectable } from "@nestjs/common";
import type { AddressContact } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseUserProfileStore, type SupabaseUserProfileClient } from "./supabase-user-profile-store";

@Injectable()
export class UserProfileService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findByEmail(email?: string): Promise<AddressContact | null> {
    return this.getStore().findByEmail(email);
  }

  async saveProfile(profile: AddressContact): Promise<AddressContact> {
    return this.getStore().saveProfile(profile);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for user profile persistence.");
    }

    return new SupabaseUserProfileStore(this.supabaseService.client as unknown as SupabaseUserProfileClient);
  }
}
