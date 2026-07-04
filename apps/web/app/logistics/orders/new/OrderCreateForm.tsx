"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, ScanLine, Trash2, UserRound } from "lucide-react";
import type { CargoItem, CargoType, LogisticsOrder, LogisticsRouteId, SupportedDestinationCountry } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { postJson } from "../../../../lib/api";
import { listAddressBookEntries, mapAddressToOrderFields, type AddressBookEntry } from "../../../../lib/local-address-book";
import { getActiveLocalUserProfile, type LocalUserProfile } from "../../../../lib/local-user-profile";
import { quoteRouteOptions } from "../../quote/quote-routes";

interface OrderFormState {
  cargoType: CargoType;
  routeId: LogisticsRouteId;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCountry: string;
  senderProvince: string;
  senderCity: string;
  senderPostalCode: string;
  senderAddressLine: string;
  senderLocationCode: string;
  senderFiasGuid: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientCountry: SupportedDestinationCountry;
  recipientProvince: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientAddressLine: string;
  recipientLocationCode: string;
  recipientFiasGuid: string;
  cargoItems: CargoItemFormRow[];
}

interface CargoItemFormRow {
  id: string;
  name: string;
  unitValueCny: string;
  quantity: string;
}

type CargoItemField = keyof Omit<CargoItemFormRow, "id">;

type RecipientField =
  | "recipientName"
  | "recipientPhone"
  | "recipientEmail"
  | "recipientCountry"
  | "recipientProvince"
  | "recipientCity"
  | "recipientPostalCode"
  | "recipientAddressLine";

const countryOptions: SupportedDestinationCountry[] = ["Russia", "Kazakhstan", "Belarus"];
const senderCountryOptions = ["China", "Russia"];

const createCargoItemRow = (id: string): CargoItemFormRow => ({
  id,
  name: "",
  unitValueCny: "",
  quantity: "1"
});

const initialState: OrderFormState = {
  cargoType: "B2C",
  routeId: "air-cdek",
  senderName: "",
  senderPhone: "",
  senderEmail: "",
  senderCountry: "China",
  senderProvince: "",
  senderCity: "",
  senderPostalCode: "",
  senderAddressLine: "",
  senderLocationCode: "",
  senderFiasGuid: "",
  recipientName: "",
  recipientPhone: "",
  recipientEmail: "",
  recipientCountry: "Russia",
  recipientProvince: "",
  recipientCity: "",
  recipientPostalCode: "",
  recipientAddressLine: "",
  recipientLocationCode: "",
  recipientFiasGuid: "",
  cargoItems: [createCargoItemRow("cargo-1")]
};

function formatQuoteAmount(quote: { amount: number; currency: string }) {
  return `${quote.amount.toFixed(2)} ${quote.currency}`;
}

const senderProfileToFields = (profile: LocalUserProfile) => ({
  senderName: profile.name,
  senderPhone: profile.phone,
  senderEmail: profile.email ?? "",
  senderCountry: profile.country || "China",
  senderProvince: profile.province,
  senderCity: profile.city,
  senderPostalCode: profile.postalCode,
  senderAddressLine: profile.addressLine,
  senderLocationCode: profile.locationCode ?? "",
  senderFiasGuid: profile.fiasGuid ?? ""
});

const importSenderProfile = (current: OrderFormState, profile: LocalUserProfile): OrderFormState => ({
  ...current,
  ...senderProfileToFields(profile)
});

const getLabeledValue = (lines: string[], labels: string[]) => {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`^(?:${escapedLabels.join("|")})\\s*[:：\\-]\\s*(.+)$`, "i");

  for (const line of lines) {
    const matched = line.match(pattern);

    if (matched?.[1]) {
      return matched[1].trim();
    }
  }

  return "";
};

const detectCountry = (text: string): SupportedDestinationCountry | "" => {
  const normalized = text.toLowerCase();
  const countries: Array<{ value: SupportedDestinationCountry; aliases: string[] }> = [
    { value: "Russia", aliases: ["russia", "russian federation", "россия", "российская", "俄罗斯", "俄羅斯"] },
    { value: "Kazakhstan", aliases: ["kazakhstan", "казахстан", "哈萨克斯坦", "哈薩克斯坦"] },
    { value: "Belarus", aliases: ["belarus", "беларусь", "白俄罗斯", "白俄羅斯"] }
  ];

  return countries.find((country) => country.aliases.some((alias) => normalized.includes(alias)))?.value ?? "";
};

const parseRecipientInfo = (rawInfo: string): Partial<Pick<OrderFormState, RecipientField>> => {
  const compactInfo = rawInfo.replace(/\s+/g, " ").trim();
  const lines = rawInfo
    .split(/\r?\n|[;；]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const withoutEmail = rawInfo.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
  const email = rawInfo.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = getLabeledValue(lines, ["电话", "手机", "联系电话", "phone", "tel", "mobile", "телефон"]) || withoutEmail.match(/(?:\+?\d[\d\s().-]{6,}\d)/)?.[0]?.trim() || "";
  const postalCode = getLabeledValue(lines, ["邮编", "邮政编码", "postal", "postal code", "zip", "zip code", "индекс"]) || compactInfo.match(/\b\d{5,6}\b/)?.[0] || "";
  const country = getLabeledValue(lines, ["国家", "country", "страна"]);
  const detectedCountry = detectCountry(country || rawInfo);
  const name = getLabeledValue(lines, ["姓名", "收件人", "收件人姓名", "name", "recipient", "receiver", "получатель"]);
  const province = getLabeledValue(lines, ["省", "州", "地区", "区域", "province", "state", "region", "область", "регион"]);
  const city = getLabeledValue(lines, ["城市", "市", "city", "город"]);
  const addressLine = getLabeledValue(lines, ["地址", "详细地址", "收件地址", "address", "street", "адрес"]);
  const fallbackName = lines.find((line) => !line.includes("@") && !phone.includes(line) && !postalCode.includes(line) && line.length <= 60) ?? "";
  const fallbackAddress = lines
    .filter((line) => line !== name && line !== fallbackName && line !== phone && line !== email && line !== postalCode)
    .filter((line) => !/^(姓名|收件人|电话|手机|邮箱|邮编|国家|省|州|地区|城市|市)\s*[:：-]/.test(line))
    .at(-1) ?? "";
  const parsedInfo: Partial<Pick<OrderFormState, RecipientField>> = {};

  if (name || fallbackName) {
    parsedInfo.recipientName = name || fallbackName;
  }

  if (phone) {
    parsedInfo.recipientPhone = phone;
  }

  if (email) {
    parsedInfo.recipientEmail = email;
  }

  if (detectedCountry) {
    parsedInfo.recipientCountry = detectedCountry;
  }

  if (province) {
    parsedInfo.recipientProvince = province;
  }

  if (city) {
    parsedInfo.recipientCity = city;
  }

  if (postalCode) {
    parsedInfo.recipientPostalCode = postalCode;
  }

  if (addressLine || fallbackAddress) {
    parsedInfo.recipientAddressLine = addressLine || fallbackAddress;
  }

  return parsedInfo;
};

function FieldLabel({ htmlFor, label, required = true }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor}>
      {label}
      {required ? <span className="required-mark"> *</span> : null}
    </label>
  );
}

export function OrderCreateForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(initialState);
  const [senderAddressBook, setSenderAddressBook] = useState<AddressBookEntry[]>([]);
  const [recipientAddressBook, setRecipientAddressBook] = useState<AddressBookEntry[]>([]);
  const [selectedSenderAddressId, setSelectedSenderAddressId] = useState("");
  const [selectedRecipientAddressId, setSelectedRecipientAddressId] = useState("");
  const [recipientRawInfo, setRecipientRawInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [assistMessage, setAssistMessage] = useState("");
  const [isAssistSuccess, setIsAssistSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<LogisticsOrder | null>(null);

  useEffect(() => {
    const profile = getActiveLocalUserProfile();
    const ownerEmail = profile?.email ?? "";

    if (profile) {
      setForm((current) => importSenderProfile(current, profile));
    }

    const senders = listAddressBookEntries({ ownerEmail, kind: "sender" });
    const recipients = listAddressBookEntries({ ownerEmail, kind: "recipient" });
    setSenderAddressBook(senders);
    setRecipientAddressBook(recipients);
    setSelectedSenderAddressId(senders[0]?.id ?? "");
    setSelectedRecipientAddressId(recipients[0]?.id ?? "");
  }, []);

  const updateField = <K extends keyof OrderFormState>(field: K, value: OrderFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCargoItem = (rowId: string, field: CargoItemField, value: string) => {
    setForm((current) => ({
      ...current,
      cargoItems: current.cargoItems.map((item) => (item.id === rowId ? { ...item, [field]: value } : item))
    }));
  };

  const addCargoItem = () => {
    setForm((current) => ({
      ...current,
      cargoItems: [...current.cargoItems, createCargoItemRow(`cargo-${Date.now()}`)]
    }));
  };

  const removeCargoItem = (rowId: string) => {
    setForm((current) => ({
      ...current,
      cargoItems: current.cargoItems.length > 1 ? current.cargoItems.filter((item) => item.id !== rowId) : current.cargoItems
    }));
  };

  const buildCargoItemsPayload = (): CargoItem[] | null => {
    const cargoItems = form.cargoItems.map((item) => ({
      name: item.name.trim(),
      unitValueCny: Number(item.unitValueCny),
      quantity: Number(item.quantity)
    }));

    return cargoItems.every((item) => item.name && Number.isFinite(item.unitValueCny) && item.unitValueCny > 0 && Number.isInteger(item.quantity) && item.quantity > 0)
      ? cargoItems
      : null;
  };

  const importActiveSenderProfile = () => {
    const profile = getActiveLocalUserProfile();

    if (!profile) {
      setAssistMessage(t("orderCreate.sender.profileMissing"));
      setIsAssistSuccess(false);
      return;
    }

    setForm((current) => importSenderProfile(current, profile));
    setAssistMessage(t("orderCreate.sender.profileImported"));
    setIsAssistSuccess(true);
  };

  const importSavedSender = () => {
    const entry = senderAddressBook.find((item) => item.id === selectedSenderAddressId) ?? senderAddressBook[0];

    if (!entry) {
      setAssistMessage(t("orderCreate.sender.addressBookEmpty"));
      setIsAssistSuccess(false);
      return;
    }

    setForm((current) => ({ ...current, ...mapAddressToOrderFields(entry, "sender") }));
    setSelectedSenderAddressId(entry.id);
    setAssistMessage(t("orderCreate.sender.addressImported"));
    setIsAssistSuccess(true);
  };

  const importSavedRecipient = () => {
    const entry = recipientAddressBook.find((item) => item.id === selectedRecipientAddressId) ?? recipientAddressBook[0];

    if (!entry) {
      setAssistMessage(t("orderCreate.recipient.addressBookEmpty"));
      setIsAssistSuccess(false);
      return;
    }

    const fields = mapAddressToOrderFields(entry, "recipient");
    const recipientCountry = countryOptions.includes(fields.recipientCountry as SupportedDestinationCountry)
      ? (fields.recipientCountry as SupportedDestinationCountry)
      : "Russia";

    setForm((current) => ({ ...current, ...fields, recipientCountry }));
    setSelectedRecipientAddressId(entry.id);
    setAssistMessage(t("orderCreate.recipient.addressImported"));
    setIsAssistSuccess(true);
  };

  const importRecipient = () => {
    if (!recipientRawInfo.trim()) {
      setAssistMessage(t("orderCreate.recipient.importEmpty"));
      setIsAssistSuccess(false);
      return;
    }

    const parsedInfo = parseRecipientInfo(recipientRawInfo);
    const parsedFields = Object.entries(parsedInfo).filter(([, value]) => value);

    if (parsedFields.length === 0) {
      setAssistMessage(t("orderCreate.recipient.importFailed"));
      setIsAssistSuccess(false);
      return;
    }

    setForm((current) => ({ ...current, ...parsedInfo }));
    setAssistMessage(t("orderCreate.recipient.importSuccess"));
    setIsAssistSuccess(true);
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setCreatedOrder(null);

    try {
      const cargoItems = buildCargoItemsPayload();

      if (!cargoItems) {
        setMessage(t("orderCreate.cargo.itemsInvalid"));
        setIsSubmitting(false);
        return;
      }

      const order = await postJson<LogisticsOrder, object>("/logistics/orders", {
        cargoType: form.cargoType,
        routeId: form.routeId,
        sender: {
          name: form.senderName,
          phone: form.senderPhone,
          email: form.senderEmail.trim() || undefined,
          country: form.senderCountry,
          province: form.senderProvince,
          city: form.senderCity,
          postalCode: form.senderPostalCode,
          addressLine: form.senderAddressLine,
          locationCode: form.senderLocationCode.trim() || undefined,
          fiasGuid: form.senderFiasGuid.trim() || undefined
        },
        recipient: {
          name: form.recipientName,
          phone: form.recipientPhone,
          email: form.recipientEmail.trim() || undefined,
          country: form.recipientCountry,
          province: form.recipientProvince,
          city: form.recipientCity,
          postalCode: form.recipientPostalCode,
          addressLine: form.recipientAddressLine,
          locationCode: form.recipientLocationCode.trim() || undefined,
          fiasGuid: form.recipientFiasGuid.trim() || undefined
        },
        cargoItems
      });

      setCreatedOrder(order);
      setMessage(t("orderCreate.success"));
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Submit failed";
      setMessage(t("orderCreate.error", { message: fallback }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel" onSubmit={submitOrder}>
      <div className="form-section-heading">
        <p className="eyebrow">{t("orderCreate.step")}</p>
        <h3>{t("orderCreate.route.title")}</h3>
        <p className="muted">{t("orderCreate.route.note")}</p>
      </div>
      <div className="route-choice-grid" role="radiogroup" aria-label={t("orderCreate.route.title")}>
        {quoteRouteOptions.map((route) => (
          <label key={route.id} className={`route-choice-card${form.routeId === route.id ? " active" : ""}`}>
            <input
              type="radio"
              name="routeId"
              value={route.id}
              checked={form.routeId === route.id}
              onChange={(event) => updateField("routeId", event.target.value as LogisticsRouteId)}
            />
            <span className="route-choice-copy">
              <strong>{t(route.labelKey)}</strong>
              <small>{t(route.noteKey)}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="form-section-heading separated">
        <h3>{t("orderCreate.cargo.title")}</h3>
        <p className="muted">{t("orderCreate.cargo.note")}</p>
      </div>
      <div className="cargo-table-wrap">
        <table className="cargo-items-table">
          <thead>
            <tr>
              <th>{t("orderCreate.cargo.itemName")}</th>
              <th>{t("orderCreate.cargo.itemValueCny")}</th>
              <th>{t("orderCreate.cargo.itemQuantity")}</th>
              <th aria-label={t("common.action")} />
            </tr>
          </thead>
          <tbody>
            {form.cargoItems.map((item, index) => (
              <tr key={item.id}>
                <td>
                  <input
                    id={`cargo-name-${item.id}`}
                    aria-label={t("orderCreate.cargo.itemName")}
                    value={item.name}
                    onChange={(event) => updateCargoItem(item.id, "name", event.target.value)}
                    required
                  />
                </td>
                <td>
                  <input
                    id={`cargo-value-${item.id}`}
                    aria-label={t("orderCreate.cargo.itemValueCny")}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.unitValueCny}
                    onChange={(event) => updateCargoItem(item.id, "unitValueCny", event.target.value)}
                    required
                  />
                </td>
                <td>
                  <input
                    id={`cargo-quantity-${item.id}`}
                    aria-label={t("orderCreate.cargo.itemQuantity")}
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateCargoItem(item.id, "quantity", event.target.value)}
                    required
                  />
                </td>
                <td>
                  <button
                    className="icon-button cargo-remove-button"
                    type="button"
                    onClick={() => removeCargoItem(item.id)}
                    disabled={form.cargoItems.length === 1}
                    title={t("orderCreate.cargo.removeItem", { index: index + 1 })}
                    aria-label={t("orderCreate.cargo.removeItem", { index: index + 1 })}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row compact cargo-table-actions">
        <button className="button" type="button" onClick={addCargoItem}>
          <Plus aria-hidden="true" />
          {t("orderCreate.cargo.addItem")}
        </button>
      </div>

      <div className="form-section-heading separated section-heading-row">
        <h3>{t("orderCreate.sender.title")}</h3>
        <button className="button" type="button" onClick={importActiveSenderProfile}>
          <UserRound aria-hidden="true" />
          {t("orderCreate.sender.importProfile")}
        </button>
      </div>
      <div className="address-import-row">
        <select value={selectedSenderAddressId} onChange={(event) => setSelectedSenderAddressId(event.target.value)}>
          <option value="">{t("orderCreate.addressBook.selectPlaceholder")}</option>
          {senderAddressBook.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} / {entry.city}
            </option>
          ))}
        </select>
        <button className="button" type="button" onClick={importSavedSender}>
          {t("orderCreate.sender.importAddressBook")}
        </button>
      </div>
      <p className="muted">{t("orderCreate.locationHint")}</p>
      <div className="form-grid">
        <div className="field"><FieldLabel htmlFor="senderName" label={t("orderCreate.label.senderName")} /><input id="senderName" value={form.senderName} onChange={(event) => updateField("senderName", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="senderPhone" label={t("orderCreate.label.senderPhone")} /><input id="senderPhone" value={form.senderPhone} onChange={(event) => updateField("senderPhone", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="senderEmail" label={t("orderCreate.label.senderEmail")} /><input id="senderEmail" type="email" value={form.senderEmail} onChange={(event) => updateField("senderEmail", event.target.value)} required /></div>
        <div className="field">
          <FieldLabel htmlFor="senderCountry" label={t("orderCreate.label.senderCountry")} />
          <select id="senderCountry" value={form.senderCountry} onChange={(event) => updateField("senderCountry", event.target.value)} required>
            {senderCountryOptions.map((country) => (
              <option key={country} value={country}>
                {t(`country.${country}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field"><FieldLabel htmlFor="senderProvince" label={t("orderCreate.label.senderProvince")} /><input id="senderProvince" value={form.senderProvince} onChange={(event) => updateField("senderProvince", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="senderCity" label={t("orderCreate.label.senderCity")} /><input id="senderCity" value={form.senderCity} onChange={(event) => updateField("senderCity", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="senderPostalCode" label={t("orderCreate.label.senderPostalCode")} /><input id="senderPostalCode" value={form.senderPostalCode} onChange={(event) => updateField("senderPostalCode", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="senderLocationCode" label={t("orderCreate.label.senderLocationCode")} required={false} /><input id="senderLocationCode" value={form.senderLocationCode} onChange={(event) => updateField("senderLocationCode", event.target.value)} /></div>
        <div className="field"><FieldLabel htmlFor="senderFiasGuid" label={t("orderCreate.label.senderFiasGuid")} required={false} /><input id="senderFiasGuid" value={form.senderFiasGuid} onChange={(event) => updateField("senderFiasGuid", event.target.value)} /></div>
        <div className="field full"><FieldLabel htmlFor="senderAddressLine" label={t("orderCreate.label.senderAddress")} /><input id="senderAddressLine" value={form.senderAddressLine} onChange={(event) => updateField("senderAddressLine", event.target.value)} required /></div>
      </div>

      <div className="form-section-heading separated section-heading-row">
        <h3>{t("orderCreate.recipient.title")}</h3>
        <button className="button" type="button" onClick={importRecipient}>
          <ScanLine aria-hidden="true" />
          {t("orderCreate.recipient.importInfo")}
        </button>
      </div>
      <div className="address-import-row">
        <select value={selectedRecipientAddressId} onChange={(event) => setSelectedRecipientAddressId(event.target.value)}>
          <option value="">{t("orderCreate.addressBook.selectPlaceholder")}</option>
          {recipientAddressBook.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} / {entry.city}
            </option>
          ))}
        </select>
        <button className="button" type="button" onClick={importSavedRecipient}>
          {t("orderCreate.recipient.importAddressBook")}
        </button>
      </div>
      <div className="field import-field">
        <FieldLabel htmlFor="recipientRawInfo" label={t("orderCreate.recipient.rawInfo")} required={false} />
        <textarea
          id="recipientRawInfo"
          rows={5}
          value={recipientRawInfo}
          onChange={(event) => setRecipientRawInfo(event.target.value)}
          placeholder={t("orderCreate.recipient.rawInfoPlaceholder")}
        />
      </div>
      {assistMessage ? <p className={isAssistSuccess ? "status success" : "status danger"}>{assistMessage}</p> : null}
      <div className="form-grid">
        <div className="field"><FieldLabel htmlFor="recipientName" label={t("orderCreate.label.recipientName")} /><input id="recipientName" value={form.recipientName} onChange={(event) => updateField("recipientName", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="recipientPhone" label={t("orderCreate.label.recipientPhone")} /><input id="recipientPhone" value={form.recipientPhone} onChange={(event) => updateField("recipientPhone", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="recipientEmail" label={t("orderCreate.label.recipientEmailOptional")} required={false} /><input id="recipientEmail" type="email" value={form.recipientEmail} onChange={(event) => updateField("recipientEmail", event.target.value)} /></div>
        <div className="field">
          <FieldLabel htmlFor="recipientCountry" label={t("orderCreate.label.recipientCountry")} />
          <select id="recipientCountry" value={form.recipientCountry} onChange={(event) => updateField("recipientCountry", event.target.value as SupportedDestinationCountry)} required>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {t(`country.${country}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field"><FieldLabel htmlFor="recipientProvince" label={t("orderCreate.label.recipientProvince")} /><input id="recipientProvince" value={form.recipientProvince} onChange={(event) => updateField("recipientProvince", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="recipientCity" label={t("orderCreate.label.recipientCity")} /><input id="recipientCity" value={form.recipientCity} onChange={(event) => updateField("recipientCity", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="recipientPostalCode" label={t("orderCreate.label.recipientPostalCode")} /><input id="recipientPostalCode" value={form.recipientPostalCode} onChange={(event) => updateField("recipientPostalCode", event.target.value)} required /></div>
        <div className="field"><FieldLabel htmlFor="recipientLocationCode" label={t("orderCreate.label.recipientLocationCode")} required={false} /><input id="recipientLocationCode" value={form.recipientLocationCode} onChange={(event) => updateField("recipientLocationCode", event.target.value)} /></div>
        <div className="field"><FieldLabel htmlFor="recipientFiasGuid" label={t("orderCreate.label.recipientFiasGuid")} required={false} /><input id="recipientFiasGuid" value={form.recipientFiasGuid} onChange={(event) => updateField("recipientFiasGuid", event.target.value)} /></div>
        <div className="field full"><FieldLabel htmlFor="recipientAddressLine" label={t("orderCreate.label.recipientAddress")} /><input id="recipientAddressLine" value={form.recipientAddressLine} onChange={(event) => updateField("recipientAddressLine", event.target.value)} required /></div>
      </div>

      <div className="button-row">
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.submitting") : t("orderCreate.button.submit")}
        </button>
      </div>
      {message ? <p className={createdOrder ? "status success" : "status danger"}>{message}</p> : null}
      {createdOrder ? (
        <div className="empty-state order-confirmation">
          <strong>{t("orderCreate.confirm.orderNo", { orderNo: createdOrder.orderNo })}</strong>
          <p>{t("orderCreate.confirm.trackingNo", { trackingNo: createdOrder.trackingNo ?? t("common.pending") })}</p>
          {createdOrder.estimatedQuote ? (
            <p>{t("orderCreate.confirm.quote", { value: formatQuoteAmount(createdOrder.estimatedQuote) })}</p>
          ) : null}
          <p>{t("orderCreate.confirm.note")}</p>
          <div className="button-row">
            <Link className="button primary" href={`/logistics/orders/${createdOrder.id}`}>
              {t("orderCreate.confirm.viewOrder")}
            </Link>
            <Link className="button" href={`/logistics/tracking`}>
              {t("orderCreate.confirm.lookupTracking")}
            </Link>
          </div>
        </div>
      ) : null}
    </form>
  );
}
