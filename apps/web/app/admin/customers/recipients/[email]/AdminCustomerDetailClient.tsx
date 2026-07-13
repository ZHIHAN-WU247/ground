"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Save } from "lucide-react";
import type { AdminCustomerAddress, AdminCustomerAddressInput, AdminCustomerAddressKind, AdminCustomerOverview, AdminCustomerProfileUpdate, AdminCustomerRiskLevel, AdminCustomerRiskProfile, CustomerDocument, CustomerDocumentReviewStatus } from "@ground/shared";
import { deleteAdminCustomerAddress, getAdminCustomer, reviewAdminCustomerDocument, saveAdminCustomerAddress, updateAdminCustomerProfile, updateAdminCustomerRiskProfile } from "../../../../../lib/admin-customers-api";
import { getAdminFileAssetSignedUrl } from "../../../../../lib/file-assets-api";

const emptyProfile: AdminCustomerProfileUpdate = {
  name: "",
  phone: "",
  country: "China",
  province: "",
  city: "",
  postalCode: "",
  addressLine: ""
};

const emptyAddress: AdminCustomerAddressInput = {
  id: "",
  label: "",
  kind: "recipient",
  name: "",
  phone: "",
  country: "China",
  province: "",
  city: "",
  postalCode: "",
  addressLine: "",
  isDefault: false
};

const emptyRiskProfile: AdminCustomerRiskProfile = {
  adminNote: "",
  tags: [],
  riskLevel: "low",
  isBlacklisted: false,
  restrictionReason: ""
};

export function AdminCustomerDetailClient({ email }: { email: string }) {
  const [customer, setCustomer] = useState<AdminCustomerOverview | null>(null);
  const [form, setForm] = useState<AdminCustomerProfileUpdate>(emptyProfile);
  const [riskForm, setRiskForm] = useState<AdminCustomerRiskProfile>(emptyRiskProfile);
  const [tagInput, setTagInput] = useState("");
  const [addressForm, setAddressForm] = useState<AdminCustomerAddressInput>(emptyAddress);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [activeAddressId, setActiveAddressId] = useState("");
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadCustomer = async () => {
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await getAdminCustomer(email);
      setCustomer(result);
      setForm(profileToForm(result));
      setRiskForm(result.riskProfile);
      setTagInput(result.riskProfile.tags.join(", "));
      setReviewNotes(notesFromDocuments(result.documents));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load customer.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomer();
  }, [email]);

  const updateField = (field: keyof AdminCustomerProfileUpdate, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateRiskField = (field: keyof AdminCustomerRiskProfile, value: string | boolean) => {
    setRiskForm((current) => ({ ...current, [field]: value }));
  };

  const updateAddressField = (field: keyof AdminCustomerAddressInput, value: string | boolean) => {
    setAddressForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await updateAdminCustomerProfile(email, form);
      setCustomer(result);
      setForm(profileToForm(result));
      setMessage("Customer profile saved to Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save customer profile.");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const saveRiskProfile = async () => {
    setIsSavingRisk(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await updateAdminCustomerRiskProfile(email, {
        ...riskForm,
        tags: tagInput.split(",").map((tag) => tag.trim()).filter(Boolean)
      });
      setCustomer(result);
      setRiskForm(result.riskProfile);
      setTagInput(result.riskProfile.tags.join(", "));
      setMessage("Customer risk profile saved to Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save customer risk profile.");
      setIsError(true);
    } finally {
      setIsSavingRisk(false);
    }
  };

  const openDocumentFile = async (document: CustomerDocument) => {
    if (!document.fileAssetId) {
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      const result = await getAdminFileAssetSignedUrl(document.fileAssetId);
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open private file.");
      setIsError(true);
    }
  };

  const editAddress = (address: AdminCustomerAddress) => {
    setAddressForm(addressToForm(address));
    setMessage("");
    setIsError(false);
  };

  const resetAddressForm = () => {
    setAddressForm(emptyAddress);
  };

  const saveAddress = async () => {
    setIsSavingAddress(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await saveAdminCustomerAddress(email, addressForm);
      setCustomer(result);
      setAddressForm(emptyAddress);
      setMessage("Customer address saved to Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save customer address.");
      setIsError(true);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const deleteAddress = async (address: AdminCustomerAddress) => {
    setActiveAddressId(address.id);
    setMessage("");
    setIsError(false);

    try {
      const result = await deleteAdminCustomerAddress(email, address.id);
      setCustomer(result);
      if (addressForm.id === address.id) {
        setAddressForm(emptyAddress);
      }
      setMessage("Customer address deleted from Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete customer address.");
      setIsError(true);
    } finally {
      setActiveAddressId("");
    }
  };

  const updateReviewNote = (documentId: string, note: string) => {
    setReviewNotes((current) => ({ ...current, [documentId]: note }));
  };

  const reviewDocument = async (document: CustomerDocument, status: CustomerDocumentReviewStatus) => {
    setActiveDocumentId(document.id);
    setMessage("");
    setIsError(false);

    try {
      const result = await reviewAdminCustomerDocument(email, document.id, {
        status,
        note: reviewNotes[document.id] ?? ""
      });
      setCustomer(result);
      setReviewNotes(notesFromDocuments(result.documents));
      setMessage("Customer document review saved to Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save document review.");
      setIsError(true);
    } finally {
      setActiveDocumentId("");
    }
  };

  if (isLoading) {
    return <div className="empty-state">Loading customer profile...</div>;
  }

  if (!customer) {
    return (
      <div className="empty-state">
        <p>{message || "Customer was not found."}</p>
        <button className="button" type="button" onClick={() => void loadCustomer()}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Customer detail</p>
          <h1>{customer.profile?.name || customer.email}</h1>
          <p className="muted">{customer.email}</p>
        </div>
        <Link className="button" href="/admin/customers/recipients">Back</Link>
      </div>

      {message ? <p className={`status ${isError ? "danger" : ""}`}>{message}</p> : null}

      <section className="panel">
        <div className="detail-head">
          <div>
            <h3>Profile</h3>
            <p>Editable customer profile stored in Supabase user_profiles.</p>
          </div>
          <button className="button primary" type="button" onClick={() => void saveProfile()} disabled={isSaving}>
            <Save size={16} /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input value={customer.email} disabled />
          </label>
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>
          <label className="field">
            <span>Country</span>
            <input value={form.country} onChange={(event) => updateField("country", event.target.value)} />
          </label>
          <label className="field">
            <span>Province</span>
            <input value={form.province} onChange={(event) => updateField("province", event.target.value)} />
          </label>
          <label className="field">
            <span>City</span>
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
          </label>
          <label className="field full">
            <span>Address</span>
            <input value={form.addressLine} onChange={(event) => updateField("addressLine", event.target.value)} />
          </label>
          <label className="field">
            <span>Location code</span>
            <input value={form.locationCode ?? ""} onChange={(event) => updateField("locationCode", event.target.value)} />
          </label>
          <label className="field">
            <span>FIAS GUID</span>
            <input value={form.fiasGuid ?? ""} onChange={(event) => updateField("fiasGuid", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="detail-head">
          <div>
            <h3>Risk controls</h3>
            <p>Internal notes, tags, blacklist and follow-up state stored in Supabase user profile metadata.</p>
          </div>
          <button className="button primary" type="button" onClick={() => void saveRiskProfile()} disabled={isSavingRisk}>
            <Save size={16} /> {isSavingRisk ? "Saving..." : "Save risk"}
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Risk level</span>
            <select value={riskForm.riskLevel} onChange={(event) => updateRiskField("riskLevel", event.target.value as AdminCustomerRiskLevel)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="field">
            <span>Blacklisted</span>
            <input type="checkbox" checked={riskForm.isBlacklisted} onChange={(event) => updateRiskField("isBlacklisted", event.target.checked)} />
          </label>
          <label className="field">
            <span>Follow-up at</span>
            <input value={riskForm.followUpAt ?? ""} onChange={(event) => updateRiskField("followUpAt", event.target.value)} placeholder="2026-02-01T00:00:00.000Z" />
          </label>
          <label className="field full">
            <span>Tags</span>
            <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="vip, address-check" />
          </label>
          <label className="field full">
            <span>Restriction reason</span>
            <input value={riskForm.restrictionReason} onChange={(event) => updateRiskField("restrictionReason", event.target.value)} />
          </label>
          <label className="field full">
            <span>Internal note</span>
            <textarea value={riskForm.adminNote} onChange={(event) => updateRiskField("adminNote", event.target.value)} rows={4} />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="detail-head">
          <div>
            <h3>Addresses</h3>
            <p>{customer.summary.addressCount} saved addresses.</p>
          </div>
          <button className="button primary" type="button" onClick={() => void saveAddress()} disabled={isSavingAddress}>
            <Save size={16} /> {isSavingAddress ? "Saving..." : "Save address"}
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Label</span>
            <input value={addressForm.label} onChange={(event) => updateAddressField("label", event.target.value)} />
          </label>
          <label className="field">
            <span>Kind</span>
            <select value={addressForm.kind} onChange={(event) => updateAddressField("kind", event.target.value as AdminCustomerAddressKind)}>
              <option value="recipient">Recipient</option>
              <option value="sender">Sender</option>
            </select>
          </label>
          <label className="field">
            <span>Name</span>
            <input value={addressForm.name} onChange={(event) => updateAddressField("name", event.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={addressForm.phone} onChange={(event) => updateAddressField("phone", event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={addressForm.email ?? ""} onChange={(event) => updateAddressField("email", event.target.value)} />
          </label>
          <label className="field">
            <span>Country</span>
            <input value={addressForm.country} onChange={(event) => updateAddressField("country", event.target.value)} />
          </label>
          <label className="field">
            <span>Province</span>
            <input value={addressForm.province} onChange={(event) => updateAddressField("province", event.target.value)} />
          </label>
          <label className="field">
            <span>City</span>
            <input value={addressForm.city} onChange={(event) => updateAddressField("city", event.target.value)} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input value={addressForm.postalCode} onChange={(event) => updateAddressField("postalCode", event.target.value)} />
          </label>
          <label className="field full">
            <span>Address</span>
            <input value={addressForm.addressLine} onChange={(event) => updateAddressField("addressLine", event.target.value)} />
          </label>
          <label className="field">
            <span>Location code</span>
            <input value={addressForm.locationCode ?? ""} onChange={(event) => updateAddressField("locationCode", event.target.value)} />
          </label>
          <label className="field">
            <span>FIAS GUID</span>
            <input value={addressForm.fiasGuid ?? ""} onChange={(event) => updateAddressField("fiasGuid", event.target.value)} />
          </label>
          <label className="field">
            <span>Default</span>
            <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => updateAddressField("isDefault", event.target.checked)} />
          </label>
        </div>
        <div className="button-row compact">
          <button className="button" type="button" onClick={resetAddressForm}>New address</button>
        </div>
        {customer.addresses.length === 0 ? <div className="empty-state">No saved addresses.</div> : null}
        <div className="grid">
          {customer.addresses.map((address) => (
            <article className="card" key={address.id}>
              <div className="detail-head">
                <div>
                  <h3>{address.label}</h3>
                  <p>{address.kind}{address.isDefault ? " / default" : ""}</p>
                </div>
              </div>
              <p>{address.name} / {address.phone}</p>
              <p className="muted">{address.addressLine}, {address.city}, {address.province}, {address.country}</p>
              <div className="button-row compact">
                <button className="button" type="button" onClick={() => editAddress(address)}>Edit</button>
                <button className="button" type="button" disabled={activeAddressId === address.id} onClick={() => void deleteAddress(address)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="detail-head">
          <div>
            <h3>Documents</h3>
            <p>{customer.summary.documentCount} customer documents and {customer.summary.fileAssetCount} private files.</p>
          </div>
        </div>
        {customer.documents.length === 0 ? <div className="empty-state">No customer documents.</div> : null}
        <div className="grid">
          {customer.documents.map((document) => (
            <article className="card" key={document.id}>
              <div className="detail-head">
                <div>
                  <h3>{document.documentType}: {document.documentNo}</h3>
                  <p>{getDocumentReviewLabel(document)}</p>
                </div>
                <button className="button" type="button" onClick={() => void openDocumentFile(document)} disabled={!document.fileAssetId}>
                  Open file
                </button>
              </div>
              <label className="field full">
                <span>Review note</span>
                <input value={reviewNotes[document.id] ?? ""} onChange={(event) => updateReviewNote(document.id, event.target.value)} />
              </label>
              <div className="button-row compact">
                <button className="button primary" type="button" disabled={activeDocumentId === document.id} onClick={() => void reviewDocument(document, "approved")}>
                  Approve
                </button>
                <button className="button" type="button" disabled={activeDocumentId === document.id} onClick={() => void reviewDocument(document, "needs_revision")}>
                  Needs revision
                </button>
                <button className="button" type="button" disabled={activeDocumentId === document.id} onClick={() => void reviewDocument(document, "rejected")}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="detail-head">
          <div>
            <h3>Related orders</h3>
            <p>{customer.summary.shopOrderCount} shop orders and {customer.summary.logisticsOrderCount} logistics orders.</p>
          </div>
        </div>
        <div className="grid two">
          <div className="grid">
            <h3>Shop orders</h3>
            {customer.shopOrders.length === 0 ? <div className="empty-state">No shop orders.</div> : null}
            {customer.shopOrders.map((order) => (
              <article className="card" key={order.id}>
                <div className="detail-head">
                  <div>
                    <h3>{order.orderNo}</h3>
                    <p>{order.status} / {new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <strong>{order.totalAmount} {order.currency}</strong>
                </div>
                {order.logisticsReferenceNo ? <p className="muted">Linked logistics: {order.logisticsReferenceNo}</p> : null}
                <Link className="button" href={`/admin/shop/orders/${order.id}`}>Open shop order</Link>
              </article>
            ))}
          </div>
          <div className="grid">
            <h3>Logistics orders</h3>
            {customer.logisticsOrders.length === 0 ? <div className="empty-state">No logistics orders.</div> : null}
            {customer.logisticsOrders.map((order) => (
              <article className="card" key={order.id}>
                <div className="detail-head">
                  <div>
                    <h3>{order.orderNo}</h3>
                    <p>{order.status} / {order.reviewState}</p>
                  </div>
                  <strong>{order.weightKg} kg</strong>
                </div>
                <p>{order.goodsName}</p>
                <p className="muted">
                  {order.cargoType} / {order.deliveryMethod}{order.routeId ? ` / ${order.routeId}` : ""}{order.trackingNo ? ` / ${order.trackingNo}` : ""}
                </p>
                <Link className="button" href={`/admin/logistics/orders/${order.id}`}>Open logistics order</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function notesFromDocuments(documents: CustomerDocument[]) {
  return Object.fromEntries(documents.map((document) => [document.id, asString(document.metadata.review_note)]));
}

function getDocumentReviewLabel(document: CustomerDocument) {
  const status = asString(document.metadata.review_status) || "pending";
  const reviewedBy = asString(document.metadata.reviewed_by);
  const reviewedAt = asString(document.metadata.reviewed_at);
  const verified = document.verifiedAt ? " / verified" : "";
  return `${status}${verified}${reviewedBy ? ` / ${reviewedBy}` : ""}${reviewedAt ? ` / ${new Date(reviewedAt).toLocaleString()}` : ""}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function addressToForm(address: AdminCustomerAddress): AdminCustomerAddressInput {
  return {
    id: address.id,
    label: address.label,
    kind: address.kind,
    name: address.name,
    phone: address.phone,
    ...(address.email ? { email: address.email } : {}),
    country: address.country,
    province: address.province,
    city: address.city,
    postalCode: address.postalCode,
    addressLine: address.addressLine,
    ...(address.locationCode ? { locationCode: address.locationCode } : {}),
    ...(address.fiasGuid ? { fiasGuid: address.fiasGuid } : {}),
    isDefault: address.isDefault
  };
}

function profileToForm(customer: AdminCustomerOverview): AdminCustomerProfileUpdate {
  const profile = customer.profile;

  return {
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    country: profile?.country ?? "China",
    province: profile?.province ?? "",
    city: profile?.city ?? "",
    postalCode: profile?.postalCode ?? "",
    addressLine: profile?.addressLine ?? "",
    ...(profile?.locationCode ? { locationCode: profile.locationCode } : {}),
    ...(profile?.fiasGuid ? { fiasGuid: profile.fiasGuid } : {})
  };
}
