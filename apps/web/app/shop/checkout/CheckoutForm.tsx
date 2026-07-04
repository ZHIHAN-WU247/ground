"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AddressContact, Product, ShopOrder } from "@ground/shared";
import { useI18n } from "../../../components/I18nProvider";
import { getJson, postJson } from "../../../lib/api";
import { getActiveLocalUserProfile } from "../../../lib/local-user-profile";

const asFormString = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export function CheckoutForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") ?? "";
  const skuId = searchParams.get("skuId") ?? "";
  const quantity = Math.max(1, Number.parseInt(searchParams.get("quantity") ?? "1", 10) || 1);
  const [product, setProduct] = useState<Product | null>(null);
  const [profile, setProfile] = useState<AddressContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<ShopOrder | null>(null);

  useEffect(() => {
    setProfile(getActiveLocalUserProfile());
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

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product || !selectedSku) {
      setError(t("shop.checkout.selectionMissing"));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const recipient: AddressContact = {
      name: asFormString(formData, "name"),
      phone: asFormString(formData, "phone"),
      email: asFormString(formData, "email"),
      country: asFormString(formData, "country"),
      province: asFormString(formData, "province"),
      city: asFormString(formData, "city"),
      postalCode: asFormString(formData, "postalCode"),
      addressLine: asFormString(formData, "addressLine")
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
        </div>
      </div>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={submitOrder}>
      <div className="checkout-product-summary">
        <img src={product.imageUrl} alt={product.name} />
        <div>
          <span>{product.category}</span>
          <h2>{product.name}</h2>
          <p>{selectedSku.model} · {selectedSku.size} × {quantity}</p>
          <strong>{selectedSku.price * quantity} {selectedSku.currency}</strong>
        </div>
      </div>

      <section className="checkout-recipient-panel">
        <div className="section-heading-row">
          <div><h2>{t("shop.checkout.recipientDetails")}</h2><p>{t("shop.checkout.recipientHint")}</p></div>
        </div>
        <div className="form-grid">
          <label className="field"><span>{t("shop.checkout.recipient")}</span><input defaultValue={profile?.name ?? ""} name="name" required /></label>
          <label className="field"><span>{t("shop.checkout.phone")}</span><input defaultValue={profile?.phone ?? ""} name="phone" required /></label>
          <label className="field"><span>{t("shop.checkout.email")}</span><input defaultValue={profile?.email ?? ""} name="email" required type="email" /></label>
          <label className="field"><span>{t("shop.checkout.country")}</span><input defaultValue={profile?.country ?? ""} name="country" required /></label>
          <label className="field"><span>{t("shop.checkout.province")}</span><input defaultValue={profile?.province ?? ""} name="province" required /></label>
          <label className="field"><span>{t("shop.checkout.city")}</span><input defaultValue={profile?.city ?? ""} name="city" required /></label>
          <label className="field"><span>{t("shop.checkout.postalCode")}</span><input defaultValue={profile?.postalCode ?? ""} name="postalCode" required /></label>
          <label className="field full"><span>{t("shop.checkout.address")}</span><input defaultValue={profile?.addressLine ?? ""} name="addressLine" required /></label>
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
