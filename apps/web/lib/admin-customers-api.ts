import type { AdminCustomerAddressInput, AdminCustomerListQuery, AdminCustomerListResult, AdminCustomerOverview, AdminCustomerProfileUpdate, AdminCustomerRiskProfile, CustomerDocumentReviewUpdate } from "@ground/shared";
import { deleteAdminJson, getAdminJson, patchAdminJson, postAdminJson } from "./api";

export async function listAdminCustomers(query: AdminCustomerListQuery = {}): Promise<AdminCustomerListResult> {
  const params = new URLSearchParams();

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.documentReviewStatus && query.documentReviewStatus !== "all") {
    params.set("documentReviewStatus", query.documentReviewStatus);
  }

  if (query.hasOrders && query.hasOrders !== "all") {
    params.set("hasOrders", query.hasOrders);
  }

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return getAdminJson<AdminCustomerListResult>(`/admin/customers/overview${suffix}`);
}

export async function getAdminCustomer(email: string): Promise<AdminCustomerOverview> {
  return getAdminJson<AdminCustomerOverview>(`/admin/customers/${encodeURIComponent(email)}`);
}

export async function updateAdminCustomerProfile(email: string, profile: AdminCustomerProfileUpdate): Promise<AdminCustomerOverview> {
  return patchAdminJson<AdminCustomerOverview, AdminCustomerProfileUpdate>(
    `/admin/customers/${encodeURIComponent(email)}/profile`,
    profile
  );
}

export async function updateAdminCustomerRiskProfile(email: string, riskProfile: AdminCustomerRiskProfile): Promise<AdminCustomerOverview> {
  return patchAdminJson<AdminCustomerOverview, AdminCustomerRiskProfile>(
    `/admin/customers/${encodeURIComponent(email)}/risk-profile`,
    riskProfile
  );
}

export async function reviewAdminCustomerDocument(
  email: string,
  documentId: string,
  input: CustomerDocumentReviewUpdate
): Promise<AdminCustomerOverview> {
  return patchAdminJson<AdminCustomerOverview, CustomerDocumentReviewUpdate>(
    `/admin/customers/${encodeURIComponent(email)}/documents/${encodeURIComponent(documentId)}/review`,
    input
  );
}

export async function saveAdminCustomerAddress(email: string, address: AdminCustomerAddressInput): Promise<AdminCustomerOverview> {
  return postAdminJson<AdminCustomerOverview, AdminCustomerAddressInput>(
    `/admin/customers/${encodeURIComponent(email)}/addresses`,
    address
  );
}

export async function deleteAdminCustomerAddress(email: string, addressId: string): Promise<AdminCustomerOverview> {
  return deleteAdminJson<AdminCustomerOverview>(
    `/admin/customers/${encodeURIComponent(email)}/addresses/${encodeURIComponent(addressId)}`
  );
}
