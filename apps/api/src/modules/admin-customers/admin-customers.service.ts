import { Injectable } from "@nestjs/common";
import type { AdminCustomerAddressInput, AdminCustomerListQuery, AdminCustomerListResult, AdminCustomerOverview, AdminCustomerProfileUpdate, AdminCustomerRiskProfile, CustomerDocumentReviewUpdate } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseAdminCustomerStore, type SupabaseAdminCustomerClient } from "./supabase-admin-customer-store";

@Injectable()
export class AdminCustomersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  listCustomers(query: AdminCustomerListQuery = {}): Promise<AdminCustomerListResult> {
    return this.getStore().listCustomers(query);
  }

  getCustomer(email: string): Promise<AdminCustomerOverview> {
    return this.getStore().getCustomer(email);
  }

  updateProfile(email: string, input: AdminCustomerProfileUpdate): Promise<AdminCustomerOverview> {
    return this.getStore().updateProfile(email, input);
  }

  updateRiskProfile(email: string, input: AdminCustomerRiskProfile): Promise<AdminCustomerOverview> {
    return this.getStore().updateRiskProfile(email, input);
  }

  reviewDocument(email: string, documentId: string, input: CustomerDocumentReviewUpdate & { reviewedBy?: string }): Promise<AdminCustomerOverview> {
    return this.getStore().reviewDocument(email, documentId, input);
  }

  saveAddress(email: string, input: AdminCustomerAddressInput): Promise<AdminCustomerOverview> {
    return this.getStore().saveAddress(email, input);
  }

  deleteAddress(email: string, addressId: string): Promise<AdminCustomerOverview> {
    return this.getStore().deleteAddress(email, addressId);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for admin customer overview.");
    }

    return new SupabaseAdminCustomerStore(this.supabaseService.client as unknown as SupabaseAdminCustomerClient);
  }
}
