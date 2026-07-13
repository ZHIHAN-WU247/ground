"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminCustomerDocumentReviewFilter, AdminCustomerHasOrdersFilter, AdminCustomerOverview, CustomerDocument } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { listAdminCustomers } from "../../../../lib/admin-customers-api";
import { getAdminFileAssetSignedUrl } from "../../../../lib/file-assets-api";

export function AdminCustomersClient() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<AdminCustomerOverview[]>([]);
  const [search, setSearch] = useState("");
  const [documentReviewStatus, setDocumentReviewStatus] = useState<AdminCustomerDocumentReviewFilter | "all">("all");
  const [hasOrders, setHasOrders] = useState<AdminCustomerHasOrdersFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomers = async (
    nextPage = page,
    overrides: Partial<{
      search: string;
      documentReviewStatus: AdminCustomerDocumentReviewFilter | "all";
      hasOrders: AdminCustomerHasOrdersFilter;
      limit: number;
    }> = {}
  ) => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await listAdminCustomers({
        search: overrides.search ?? search,
        documentReviewStatus: overrides.documentReviewStatus ?? documentReviewStatus,
        hasOrders: overrides.hasOrders ?? hasOrders,
        page: nextPage,
        limit: overrides.limit ?? limit
      });
      setCustomers(result.items);
      setTotal(result.total);
      setPage(result.page);
      setLimit(result.limit);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers(1);
  }, [documentReviewStatus, hasOrders, limit]);

  const applySearch = () => {
    void loadCustomers(1);
  };

  const resetFilters = () => {
    setSearch("");
    setDocumentReviewStatus("all");
    setHasOrders("all");
    setLimit(10);
    void loadCustomers(1, { search: "", documentReviewStatus: "all", hasOrders: "all", limit: 10 });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openDocumentFile = async (document: CustomerDocument) => {
    if (!document.fileAssetId) {
      return;
    }

    setMessage("");

    try {
      const result = await getAdminFileAssetSignedUrl(document.fileAssetId);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open private file.");
    }
  };

  return (
    <div className="grid">
      <div className="form-section-heading">
        <p className="eyebrow">{t("admin.customers.recipients.eyebrow")}</p>
        <h1>{t("admin.customers.recipients.title")}</h1>
        <p className="muted">{t("admin.customers.recipients.description")}</p>
      </div>
      <div className="panel">
        <div className="detail-head">
          <div>
            <h3>Customer profiles</h3>
            <p>{total} customers from Supabase</p>
          </div>
          <button className="button" type="button" onClick={() => void loadCustomers()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }} placeholder="Email, name, phone, order no." />
          </label>
          <label className="field">
            <span>Document status</span>
            <select value={documentReviewStatus} onChange={(event) => setDocumentReviewStatus(event.target.value as AdminCustomerDocumentReviewFilter | "all")}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="needs_revision">Needs revision</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="field">
            <span>Orders</span>
            <select value={hasOrders} onChange={(event) => setHasOrders(event.target.value as AdminCustomerHasOrdersFilter)}>
              <option value="all">All</option>
              <option value="true">Has orders</option>
              <option value="false">No orders</option>
            </select>
          </label>
          <label className="field">
            <span>Page size</span>
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="button-row compact">
          <button className="button primary" type="button" onClick={applySearch} disabled={isLoading}>Search</button>
          <button className="button" type="button" onClick={resetFilters} disabled={isLoading}>Reset</button>
          <button className="button" type="button" onClick={() => void loadCustomers(page - 1)} disabled={isLoading || page <= 1}>Previous</button>
          <span className="status">Page {page} / {totalPages}</span>
          <button className="button" type="button" onClick={() => void loadCustomers(page + 1)} disabled={isLoading || page >= totalPages}>Next</button>
        </div>
        {message ? <p className="status danger">{message}</p> : null}
        {customers.length === 0 && !isLoading ? (
          <div className="empty-state">No customer data yet.</div>
        ) : (
          <div className="grid">
            {customers.map((customer) => (
              <article className="card" key={customer.email}>
                <div className="detail-head">
                  <div>
                    <h3>{customer.profile?.name || customer.email}</h3>
                    <p>{customer.email}</p>
                  </div>
                  <div className="button-row compact">
                    <span className="status">{customer.summary.addressCount} addresses</span>
                    <Link className="button" href={`/admin/customers/recipients/${encodeURIComponent(customer.email)}`}>
                      View
                    </Link>
                  </div>
                </div>
                <p className="muted">
                  {customer.profile?.phone || "No phone"} · {customer.profile?.city || "No city"} · {customer.profile?.country || "No country"}
                </p>

                {customer.addresses.length > 0 ? (
                  <div className="grid">
                    {customer.addresses.map((address) => (
                      <div className="empty-state" key={address.id}>
                        <strong>{address.label}</strong>
                        <p>{address.name} · {address.phone}</p>
                        <p>{address.addressLine}, {address.city}, {address.country}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {customer.documents.length > 0 ? (
                  <div className="button-row compact">
                    {customer.documents.map((document) => (
                      <button className="button" type="button" key={document.id} onClick={() => openDocumentFile(document)} disabled={!document.fileAssetId}>
                        {document.documentType}: {document.documentNo}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
