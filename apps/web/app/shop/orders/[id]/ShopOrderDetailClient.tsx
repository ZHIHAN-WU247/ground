"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ShopOrder } from "@ground/shared";
import { StatusBadge } from "../../../../components/StatusBadge";
import { useI18n } from "../../../../components/I18nProvider";
import { getJson } from "../../../../lib/api";
import { getActiveLocalUserProfile } from "../../../../lib/local-user-profile";

function formatAmount(order: ShopOrder) {
  return `${order.totalAmount.toFixed(2)} ${order.currency}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ShopOrderDetailClient({ id }: { id: string }) {
  const { t } = useI18n();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = async (email: string) => {
    setIsLoading(true);
    setError("");

    try {
      const loadedOrder = await getJson<ShopOrder>(`/shop/orders/${encodeURIComponent(id)}`);
      setOrder(loadedOrder);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setError(t("account.orders.error", { message: fallback }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const email = getActiveLocalUserProfile()?.email?.trim().toLowerCase() ?? "";
    setOwnerEmail(email);

    if (!email) {
      setIsLoading(false);
      return;
    }

    void loadOrder(email);
  }, [id]);

  if (!ownerEmail) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h2>{t("account.orders.loginTitle")}</h2>
          <p>{t("account.orders.loginBody")}</p>
          <Link className="button primary" href={`/auth/login?next=/shop/orders/${encodeURIComponent(id)}`}>
            {t("account.orders.loginAction")}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="empty-state">{t("account.orders.loading")}</div>;
  }

  if (error || !order) {
    return (
      <div className="panel">
        <div className="empty-state">{error || t("account.orders.emptyShop")}</div>
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => void loadOrder(ownerEmail)}>
            {t("common.retry")}
          </button>
          <Link className="button" href="/account/orders">{t("shop.checkout.viewMyOrders")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel table-panel">
      <div className="table-actions">
        <div>
          <h2>{order.orderNo}</h2>
          <p className="muted">{t("account.orders.createdAt")}: {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="form-grid">
        <div>
          <strong>{t("common.amount")}</strong>
          <p>{formatAmount(order)}</p>
        </div>
        <div>
          <strong>{t("shop.orders.logisticsRef")}</strong>
          <p>{order.logisticsReferenceNo ?? t("common.pending")}</p>
        </div>
        <div>
          <strong>{t("shop.checkout.recipient")}</strong>
          <p>{order.recipient.name} / {order.recipient.phone}</p>
          <p className="soft">{order.recipient.city}, {order.recipient.country}</p>
          <p className="soft">{order.recipient.addressLine}</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>{t("shop.products.title")}</th>
              <th>SKU</th>
              <th>{t("orderCreate.cargo.itemQuantity")}</th>
              <th>{t("common.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.productId}-${item.skuId}`}>
                <td>{item.productName}</td>
                <td>{item.skuModel} / {item.skuSize}</td>
                <td>{item.quantity}</td>
                <td>{(item.unitPrice * item.quantity).toFixed(2)} {order.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row">
        <Link className="button" href="/account/orders">{t("shop.checkout.viewMyOrders")}</Link>
        {order.logisticsReferenceNo ? (
          <Link className="button primary" href="/logistics/tracking">{t("shop.order.detail.gotoTracking")}</Link>
        ) : null}
      </div>
    </div>
  );
}
