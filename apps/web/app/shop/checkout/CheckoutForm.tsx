"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, LogIn, MapPin, PackageCheck, Users } from "lucide-react";
import type { AddressContact, Product, ShopOrder } from "@ground/shared";
import { useI18n } from "../../../components/I18nProvider";
import { listPersistentAddressBookEntries } from "../../../lib/address-book-api";
import { getJson, postJson } from "../../../lib/api";
import type { AddressBookEntry } from "../../../lib/local-address-book";
import { getActiveLocalUserProfile } from "../../../lib/local-user-profile";
import { getSupabaseAccessToken } from "../../../lib/supabase-auth";
import { isCheckoutOrderAuthReady } from "./checkout-auth";

type CheckoutRecipientForm = Required<Pick<AddressContact, "name" | "phone" | "country" | "province" | "city" | "postalCode" | "addressLine">> & {
  email: string;
};

const emptyRecipientForm: CheckoutRecipientForm = {
  name: "",
  phone: "",
  email: "",
  country: "",
  province: "",
  city: "",
  postalCode: "",
  addressLine: ""
};

const contactToRecipientForm = (contact: AddressContact | null | undefined): CheckoutRecipientForm => ({
  name: contact?.name ?? "",
  phone: contact?.phone ?? "",
  email: contact?.email ?? "",
  country: contact?.country ?? "",
  province: contact?.province ?? "",
  city: contact?.city ?? "",
  postalCode: contact?.postalCode ?? "",
  addressLine: contact?.addressLine ?? ""
});

export function CheckoutForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") ?? "";
  const skuId = searchParams.get("skuId") ?? "";
  const quantity = Math.max(1, Number.parseInt(searchParams.get("quantity") ?? "1", 10) || 1);
  const [product, setProduct] = useState<Product | null>(null);
  const [profile, setProfile] = useState<AddressContact | null>(null);
  const [recipientForm, setRecipientForm] = useState<CheckoutRecipientForm>(emptyRecipientForm);
  const [recipientAddressBook, setRecipientAddressBook] = useState<AddressBookEntry[]>([]);
  const [selectedRecipientAddressId, setSelectedRecipientAddressId] = useState("");
  const [addressBookMessage, setAddressBookMessage] = useState("");
  const [isAddressBookSuccess, setIsAddressBookSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<ShopOrder | null>(null);

  useEffect(() => {
    const activeProfile = getActiveLocalUserProfile();
    const ownerEmail = activeProfile?.email ?? "";

    setProfile(activeProfile);
    setRecipientForm(contactToRecipientForm(activeProfile));

    void listPersistentAddressBookEntries({ ownerEmail, kind: "recipient" }).then((recipients) => {
      setRecipientAddressBook(recipients);
      setSelectedRecipientAddressId(recipients.find((entry) => entry.isDefault)?.id ?? recipients[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadProduct = async () => {
      if (!productId || !skuId) {
        setError(t("shop.checkout.selectionMissing"));
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await getJson<Product>(`/shop/products/${encodeURIComponent(productId)}`);
        const sku = loaded.skus.find((item) => item.id === skuId);

        if (!sku) {
          throw new Error(t("shop.checkout.skuUnavailable"));
        }

        if (isCurrent) {
          setProduct(loaded);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : t("shop.checkout.selectionMissing"));
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();
    return () => {
      isCurrent = false;
    };
  }, [productId, skuId, t]);

  const selectedSku = useMemo(() => product?.skus.find((item) => item.id === skuId), [product, skuId]);
  const visibleRecipientAddressBook = useMemo(
    () => [...recipientAddressBook].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).slice(0, 3),
    [recipientAddressBook]
  );
  const loginReturnPath = `/shop/checkout?productId=${encodeURIComponent(productId)}&skuId=${encodeURIComponent(skuId)}&quantity=${quantity}`;

  const updateRecipientField = <K extends keyof CheckoutRecipientForm>(field: K, value: CheckoutRecipientForm[K]) => {
    setRecipientForm((current) => ({ ...current, [field]: value }));
  };

  const applyRecipientEntry = (entry: AddressBookEntry | undefined) => {
    if (!entry) {
      setAddressBookMessage(t("shop.checkout.addressBookEmpty"));
      setIsAddressBookSuccess(false);
      return;
    }

    setRecipientForm(contactToRecipientForm(entry));
    setSelectedRecipientAddressId(entry.id);
    setAddressBookMessage(t("shop.checkout.addressImported"));
    setIsAddressBookSuccess(true);
  };

  const importSavedRecipient = () => {
    applyRecipientEntry(recipientAddressBook.find((item) => item.id === selectedRecipientAddressId) ?? visibleRecipientAddressBook[0]);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product || !selectedSku) {
      setError(t("shop.checkout.selectionMissing"));
      return;
    }

    if (!isCheckoutOrderAuthReady(getSupabaseAccessToken())) {
      setError(t("shop.checkout.loginRequired"));
      return;
    }

    const recipient: AddressContact = {
      name: recipientForm.name.trim(),
      phone: recipientForm.phone.trim(),
      email: recipientForm.email.trim(),
      country: recipientForm.country.trim(),
      province: recipientForm.province.trim(),
      city: recipientForm.city.trim(),
      postalCode: recipientForm.postalCode.trim(),
      addressLine: recipientForm.addressLine.trim()
    };

    setIsSubmitting(true);
    setError("");

    try {
      const order = await postJson<ShopOrder, { items: Array<{ productId: string; quantity: number; skuId: string }>; recipient: AddressContact }>(
        "/shop/orders",
        {
          items: [{ productId: product.id, skuId: selectedSku.id, quantity }],
          recipient
        }
      );
      setCreatedOrder(order);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Submit failed";
      setError(t("shop.checkout.error", { message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="empty-state">{t("shop.checkout.loading")}</div>;
  }

  if (!product || !selectedSku) {
    return (
      <div className="empty-state">
        <p>{error || t("shop.checkout.selectionMissing")}</p>
        <Link className="button" href="/shop/products">{t("shop.checkout.backToProducts")}</Link>
      </div>
    );
  }

  if (createdOrder) {
    return (
      <div className="checkout-success">
        <span>{t("shop.checkout.successEyebrow")}</span>
        <h2>{createdOrder.orderNo}</h2>
        <p>{t("shop.checkout.success")}</p>
        <div className="button-row">
          <Link className="button primary" href="/shop/products">{t("shop.checkout.continueShopping")}</Link>
          <Link className="button" href="/account/orders">{t("shop.checkout.viewMyOrders")}</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={submitOrder}>
      <div className="checkout-product-summary">
        <img src={product.imageUrl} alt={product.name} />
        <div>
          <span className="checkout-summary-kicker"><PackageCheck aria-hidden="true" />{product.category}</span>
          <h2>{product.name}</h2>
          <p>{selectedSku.model} · {selectedSku.size} × {quantity}</p>
          <strong>{selectedSku.price * quantity} {selectedSku.currency}</strong>
        </div>
      </div>

      <section className="checkout-recipient-panel">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{t("shop.checkout.recipientEyebrow")}</p>
            <h2>{t("shop.checkout.recipientDetails")}</h2>
            <p>{t("shop.checkout.recipientHint")}</p>
          </div>
          <Link className="button checkout-login-link" href={`/auth/login?returnTo=${encodeURIComponent(loginReturnPath)}`}>
            <LogIn aria-hidden="true" />
            {t("shop.checkout.loginAction")}
          </Link>
        </div>
        <div className="checkout-address-book">
          <div className="checkout-address-book-head">
            <span><Users aria-hidden="true" />{t("shop.checkout.quickRecipients")}</span>
            <Link href="/account/recipients">{t("shop.checkout.manageRecipients")}</Link>
          </div>
          {visibleRecipientAddressBook.length > 0 ? (
            <div className="checkout-address-card-grid">
              {visibleRecipientAddressBook.map((entry) => (
                <button
                  className={entry.id === selectedRecipientAddressId ? "checkout-address-card active" : "checkout-address-card"}
                  key={entry.id}
                  type="button"
                  onClick={() => applyRecipientEntry(entry)}
                >
                  <span>{entry.isDefault ? <Check aria-hidden="true" /> : <MapPin aria-hidden="true" />}{entry.label}</span>
                  <strong>{entry.name}</strong>
                  <small>{entry.city}, {entry.country} / {entry.phone}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="checkout-address-empty">{t("shop.checkout.addressBookEmpty")}</div>
          )}
          <div className="address-import-row">
            <select value={selectedRecipientAddressId} onChange={(event) => setSelectedRecipientAddressId(event.target.value)}>
              <option value="">{t("shop.checkout.addressBookPlaceholder")}</option>
              {recipientAddressBook.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} / {entry.name} / {entry.city}
                </option>
              ))}
            </select>
            <button className="button" type="button" onClick={importSavedRecipient}>
              {t("shop.checkout.importAddressBook")}
            </button>
          </div>
        </div>
        {addressBookMessage ? <p className={isAddressBookSuccess ? "status success" : "status danger"}>{addressBookMessage}</p> : null}
        <div className="form-grid">
          <label className="field"><span>{t("shop.checkout.recipient")}</span><input value={recipientForm.name} onChange={(event) => updateRecipientField("name", event.target.value)} name="name" required /></label>
          <label className="field"><span>{t("shop.checkout.phone")}</span><input value={recipientForm.phone} onChange={(event) => updateRecipientField("phone", event.target.value)} name="phone" required /></label>
          <label className="field"><span>{t("shop.checkout.email")}</span><input value={recipientForm.email} onChange={(event) => updateRecipientField("email", event.target.value)} name="email" required type="email" /></label>
          <label className="field"><span>{t("shop.checkout.country")}</span><input value={recipientForm.country} onChange={(event) => updateRecipientField("country", event.target.value)} name="country" required /></label>
          <label className="field"><span>{t("shop.checkout.province")}</span><input value={recipientForm.province} onChange={(event) => updateRecipientField("province", event.target.value)} name="province" required /></label>
          <label className="field"><span>{t("shop.checkout.city")}</span><input value={recipientForm.city} onChange={(event) => updateRecipientField("city", event.target.value)} name="city" required /></label>
          <label className="field"><span>{t("shop.checkout.postalCode")}</span><input value={recipientForm.postalCode} onChange={(event) => updateRecipientField("postalCode", event.target.value)} name="postalCode" required /></label>
          <label className="field full"><span>{t("shop.checkout.address")}</span><input value={recipientForm.addressLine} onChange={(event) => updateRecipientField("addressLine", event.target.value)} name="addressLine" required /></label>
        </div>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="button-row">
          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("common.submitting") : t("common.submitOrder")}
          </button>
        </div>
      </section>
    </form>
  );
}
