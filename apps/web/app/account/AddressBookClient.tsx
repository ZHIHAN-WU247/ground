"use client";

import { useEffect, useState } from "react";
import type { AddressContact } from "@ground/shared";
import { useI18n } from "../../components/I18nProvider";
import {
  deleteAddressBookEntry,
  listAddressBookEntries,
  saveAddressBookEntry,
  type AddressBookEntry,
  type AddressBookKind
} from "../../lib/local-address-book";
import { getActiveLocalUserProfile } from "../../lib/local-user-profile";

interface AddressBookClientProps {
  kind: AddressBookKind;
}

type AddressFormState = AddressContact & {
  id: string;
  label: string;
  isDefault: boolean;
};

const supportedRecipientCountries = ["Russia", "Kazakhstan", "Belarus"];
const supportedSenderCountries = ["China", "Russia"];

const getEmptyForm = (kind: AddressBookKind): AddressFormState => ({
  id: "",
  label: "",
  name: "",
  phone: "",
  email: "",
  country: kind === "sender" ? "China" : "Russia",
  province: "",
  city: "",
  postalCode: "",
  addressLine: "",
  locationCode: "",
  fiasGuid: "",
  isDefault: false
});

export function AddressBookClient({ kind }: AddressBookClientProps) {
  const { t } = useI18n();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [form, setForm] = useState<AddressFormState>(() => getEmptyForm(kind));
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const countries = kind === "sender" ? supportedSenderCountries : supportedRecipientCountries;

  const loadEntries = (email: string) => {
    setEntries(listAddressBookEntries({ ownerEmail: email, kind }));
  };

  useEffect(() => {
    const profile = getActiveLocalUserProfile();
    const email = profile?.email ?? "";
    setOwnerEmail(email);
    loadEntries(email);
  }, [kind]);

  const updateField = <K extends keyof AddressFormState>(field: K, value: AddressFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(getEmptyForm(kind));
  };

  const editEntry = (entry: AddressBookEntry) => {
    setForm({
      id: entry.id,
      label: entry.label,
      name: entry.name,
      phone: entry.phone,
      email: entry.email ?? "",
      country: entry.country,
      province: entry.province,
      city: entry.city,
      postalCode: entry.postalCode,
      addressLine: entry.addressLine,
      locationCode: entry.locationCode ?? "",
      fiasGuid: entry.fiasGuid ?? "",
      isDefault: entry.isDefault
    });
    setMessage("");
  };

  const removeEntry = (id: string) => {
    deleteAddressBookEntry({ ownerEmail, id });
    loadEntries(ownerEmail);
    setMessage(t("account.addressBook.deleted"));
  };

  const makeDefault = (entry: AddressBookEntry) => {
    saveAddressBookEntry({
      ownerEmail,
      entry: {
        ...entry,
        isDefault: true
      }
    });
    loadEntries(ownerEmail);
    setMessage(t("account.addressBook.defaultSaved"));
  };

  const saveEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const saved = saveAddressBookEntry({
      ownerEmail,
      entry: {
        ...form,
        kind
      }
    });

    loadEntries(ownerEmail);
    resetForm();
    setMessage(t(form.id ? "account.addressBook.updated" : "account.addressBook.saved", { label: saved.label }));
    setIsSubmitting(false);
  };

  return (
    <div className="account-book-layout">
      <form className="panel" onSubmit={saveEntry}>
        <div className="form-section-heading">
          <p className="eyebrow">{t(kind === "sender" ? "account.addressBook.senderForm" : "account.addressBook.recipientForm")}</p>
          <h3>{form.id ? t("account.addressBook.editTitle") : t("account.addressBook.newTitle")}</h3>
          {!ownerEmail ? <p className="muted">{t("account.addressBook.localScopeNote")}</p> : null}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="addressLabel">{t("account.addressBook.label")}</label>
            <input id="addressLabel" value={form.label} onChange={(event) => updateField("label", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressName">{t("auth.name")}</label>
            <input id="addressName" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressPhone">{t("auth.phone")}</label>
            <input id="addressPhone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressEmail">{t("auth.email")}</label>
            <input id="addressEmail" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="addressCountry">{t(kind === "sender" ? "orderCreate.label.senderCountry" : "orderCreate.label.recipientCountry")}</label>
            <select id="addressCountry" value={form.country} onChange={(event) => updateField("country", event.target.value)} required>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {t(`country.${country}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="addressProvince">{t("auth.province")}</label>
            <input id="addressProvince" value={form.province} onChange={(event) => updateField("province", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressCity">{t("auth.city")}</label>
            <input id="addressCity" value={form.city} onChange={(event) => updateField("city", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressPostalCode">{t("auth.postalCode")}</label>
            <input id="addressPostalCode" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="addressLocationCode">{t("account.addressBook.locationCode")}</label>
            <input id="addressLocationCode" value={form.locationCode} onChange={(event) => updateField("locationCode", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="addressFiasGuid">{t("account.addressBook.fiasGuid")}</label>
            <input id="addressFiasGuid" value={form.fiasGuid} onChange={(event) => updateField("fiasGuid", event.target.value)} />
          </div>
          <div className="field full">
            <label htmlFor="addressLine">{t("auth.address")}</label>
            <input id="addressLine" value={form.addressLine} onChange={(event) => updateField("addressLine", event.target.value)} required />
          </div>
          <label className="checkbox-row field full">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => updateField("isDefault", event.target.checked)} />
            <span>{t("account.addressBook.default")}</span>
          </label>
        </div>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.submitting") : t("account.addressBook.save")}
          </button>
          {form.id ? (
            <button className="button" type="button" onClick={resetForm}>
              {t("account.addressBook.cancelEdit")}
            </button>
          ) : null}
        </div>
        {message ? <p className="status success">{message}</p> : null}
      </form>

      <div className="panel">
        <div className="form-section-heading">
          <p className="eyebrow">{t("account.addressBook.savedList")}</p>
          <h3>{t(kind === "sender" ? "account.senders.title" : "account.recipients.title")}</h3>
        </div>
        {entries.length === 0 ? (
          <div className="empty-state">{t("account.addressBook.empty")}</div>
        ) : (
          <div className="grid">
            {entries.map((entry) => (
              <article className="card address-card" key={entry.id}>
                <div className="detail-head">
                  <div>
                    <h3>{entry.label}</h3>
                    <p>{entry.name} / {entry.phone}</p>
                  </div>
                  {entry.isDefault ? <span className="status success">{t("account.addressBook.defaultBadge")}</span> : null}
                </div>
                <p className="muted">{entry.addressLine}, {entry.city}, {entry.province}, {entry.country}</p>
                <p className="soft">{entry.email || t("account.addressBook.noEmail")} / {entry.postalCode}</p>
                <div className="button-row compact">
                  <button className="button" type="button" onClick={() => editEntry(entry)}>
                    {t("account.addressBook.edit")}
                  </button>
                  <button className="button" type="button" onClick={() => makeDefault(entry)} disabled={entry.isDefault}>
                    {t("account.addressBook.makeDefault")}
                  </button>
                  <button className="button" type="button" onClick={() => removeEntry(entry.id)}>
                    {t("account.addressBook.delete")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
