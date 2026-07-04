"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Headset, RefreshCw } from "lucide-react";
import type { LogisticsOrder } from "@ground/shared";
import { StatusBadge } from "../../../../components/StatusBadge";
import { TrackingTimeline } from "../../../../components/TrackingTimeline";
import { useI18n } from "../../../../components/I18nProvider";
import { getJson } from "../../../../lib/api";

const supportEmail = "support@ground.local";

export function LogisticsOrderDetailClient({ id }: { id: string }) {
  const { t } = useI18n();
  const [order, setOrder] = useState<LogisticsOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const result = await getJson<LogisticsOrder>(`/logistics/orders/${encodeURIComponent(id)}`);
      setOrder(result);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setError(t("orders.detail.error", { message: fallback }));
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [id, t]);

  useEffect(() => {
    if (!order || order.reviewState !== "APPROVED" || order.trackingNo || order.carrierCreateState !== "SUBMITTED") {
      return;
    }

    const timer = window.setInterval(() => {
      void loadOrder("refresh");
    }, 5000);

    return () => window.clearInterval(timer);
  }, [order, t]);

  if (isLoading) {
    return <div className="empty-state">{t("orders.detail.loading")}</div>;
  }

  if (error || !order) {
    return <div className="empty-state">{error || t("orders.detail.missing")}</div>;
  }

  const isRejected = order.status === "REJECTED";
  const estimatedQuote = order.estimatedQuote ? `${order.estimatedQuote.amount.toFixed(2)} ${order.estimatedQuote.currency}` : t("orders.summary.quotePending");

  return (
    <div className="grid two">
      <div className="grid">
        <div className="panel">
          <div className="detail-head">
            <StatusBadge status={order.status} />
            <button className="button" type="button" onClick={() => void loadOrder("refresh")} disabled={isRefreshing}>
              <RefreshCw aria-hidden="true" />
              {isRefreshing ? t("common.submitting") : t("common.refresh")}
            </button>
          </div>
          <h3 style={{ marginTop: 16 }}>{t("orders.summary")}</h3>
          <p>{t("tracking.order.trackingNo", { trackingNo: order.trackingNo ?? t("common.pending") })}</p>
          <p>{t("orders.summary.reviewState", { value: t(`admin.reviewState.${order.reviewState}`) })}</p>
          <p>{t("orders.summary.labelStatus", { value: order.labelStatus ?? "NOT_REQUESTED" })}</p>
          <p>{t("orders.summary.trackingSync", { value: order.trackingSyncStatus ?? "NOT_STARTED" })}</p>
          <p>{t("orders.summary.quote", { value: estimatedQuote })}</p>
          {order.estimatedQuote ? (
            <p>{t("orders.summary.quoteChargeable", { value: order.estimatedQuote.chargeableWeightKg.toFixed(2) })}</p>
          ) : null}
          <p>{t("orders.summary.destination", { value: `${order.recipient.city}, ${order.recipient.country}` })}</p>
          <p>{t("orders.summary.goods", { value: order.goodsName })}</p>
          {order.reviewFailureReason ? (
            <p className={isRejected ? "status danger" : "status"}>{order.reviewFailureReason}</p>
          ) : null}
        </div>

        {isRejected ? (
          <div className="panel support-panel">
            <p className="eyebrow">{t("orders.support.eyebrow")}</p>
            <h3>{t("orders.support.title")}</h3>
            <p>{t("orders.support.body", { orderNo: order.orderNo })}</p>
            <div className="button-row">
              <a
                className="button primary"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Rejected logistics order ${order.orderNo}`)}`}
              >
                <Headset aria-hidden="true" />
                {t("orders.support.contact")}
              </a>
              <Link className="button" href="/logistics/orders/new">
                {t("orders.support.createNew")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <TrackingTimeline events={order.events} />
    </div>
  );
}
