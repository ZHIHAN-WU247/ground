"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LogisticsOrder } from "@ground/shared";
import { PageHero } from "../../../components/PageHero";
import { StatusBadge } from "../../../components/StatusBadge";
import { useI18n } from "../../../components/I18nProvider";
import { getJson } from "../../../lib/api";
import { getActiveLocalUserProfile } from "../../../lib/local-user-profile";

export function LogisticsOrdersClient() {
  const { t } = useI18n();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasPendingTrackingNumber = orders.some((order) => order.reviewState === "APPROVED" && !order.trackingNo && order.carrierCreateState === "SUBMITTED");

  const loadOrders = async (email: string) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getJson<LogisticsOrder[]>("/logistics/orders");
      setOrders(result);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setError(t("orders.error", { message: fallback }));
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

    void loadOrders(email);
  }, []);

  useEffect(() => {
    if (!hasPendingTrackingNumber) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadOrders(ownerEmail);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [hasPendingTrackingNumber, ownerEmail]);

  const formatQuoteAmount = (order: LogisticsOrder) => {
    if (!order.estimatedQuote) {
      return t("orders.summary.quotePending");
    }

    return `${order.estimatedQuote.amount.toFixed(2)} ${order.estimatedQuote.currency}`;
  };

  return (
    <>
      <PageHero eyebrowKey="orders.eyebrow" titleKey="orders.title" descriptionKey="orders.description" actions={[{ href: "/logistics/orders/new", labelKey: "orders.create", primary: true }]} />
      <section className="shell section">
        {!ownerEmail ? (
          <div className="panel">
            <div className="empty-state">
              <h2>{t("account.orders.loginTitle")}</h2>
              <p>{t("account.orders.loginBody")}</p>
              <Link className="button primary" href="/auth/login?next=/logistics/orders">
                {t("account.orders.loginAction")}
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="empty-state">{t("orders.loading")}</div>
        ) : error ? (
          <div className="panel">
            <div className="empty-state">{error}</div>
            <div className="button-row">
              <button className="button primary" type="button" onClick={() => void loadOrders(ownerEmail)}>
                {t("common.retry")}
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">{t("orders.empty")}</div>
        ) : (
          <div className="panel table-panel">
            <div className="table-actions">
              <p className="muted">{t("orders.count", { count: orders.length })}</p>
              <button className="button" type="button" onClick={() => void loadOrders(ownerEmail)}>
                {t("common.refresh")}
              </button>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("common.orderNo")}</th>
                    <th>{t("common.cargoType")}</th>
                    <th>{t("common.destination")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("common.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNo}</strong>
                        <p className="soft">{t("tracking.order.trackingNo", { trackingNo: order.trackingNo ?? t("common.pending") })}</p>
                        <p className="soft">{t("orders.summary.reviewState", { value: t(`admin.reviewState.${order.reviewState}`) })}</p>
                        <p className="soft">{t("orders.summary.quote", { value: formatQuoteAmount(order) })}</p>
                      </td>
                      <td>{order.cargoType}</td>
                      <td>{order.recipient.city}, {order.recipient.country}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td><Link className="button" href={`/logistics/orders/${order.id}`}>{t("common.view")}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
