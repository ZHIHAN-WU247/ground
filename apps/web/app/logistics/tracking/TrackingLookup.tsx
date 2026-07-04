"use client";

import Link from "next/link";
import { useState } from "react";
import { Headset } from "lucide-react";
import type { LogisticsOrder } from "@ground/shared";
import { StatusBadge } from "../../../components/StatusBadge";
import { useI18n } from "../../../components/I18nProvider";
import { TrackingTimeline } from "../../../components/TrackingTimeline";
import { getJson } from "../../../lib/api";

interface MessageState {
  key: string;
  values?: Record<string, string | number> | undefined;
}

const supportEmail = "support@ground.local";

export function TrackingLookup() {
  const { t } = useI18n();
  const [trackingNo, setTrackingNo] = useState("GLB10010001");
  const [order, setOrder] = useState<LogisticsOrder | null>(null);
  const [message, setMessage] = useState<MessageState | null>({ key: "tracking.initial" });
  const [isLoading, setIsLoading] = useState(false);

  const lookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = trackingNo.trim();

    if (!keyword) {
      setOrder(null);
      setMessage({ key: "tracking.emptyKeyword" });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOrder(null);

    try {
      const result = await getJson<LogisticsOrder>(`/logistics/tracking/${encodeURIComponent(keyword)}`);
      setOrder(result);
      setMessage(null);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Lookup failed";
      setMessage({ key: "tracking.notFound", values: { message: fallback } });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid two">
      <form className="panel" onSubmit={lookup}>
        <div className="form-section-heading">
          <p className="eyebrow">{t("tracking.step")}</p>
          <h3>{t("tracking.form.title")}</h3>
          <p className="muted">{t("tracking.form.note")}</p>
        </div>
        <div className="field">
          <label htmlFor="trackingNo">{t("tracking.label.keyword")}</label>
          <input id="trackingNo" value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} placeholder={t("tracking.placeholder")} />
        </div>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={isLoading}>
            {isLoading ? t("tracking.button.loading") : t("tracking.button")}
          </button>
        </div>
        {message ? <div className="empty-state lookup-message">{t(message.key, message.values)}</div> : null}
      </form>
      <div className="panel">
        <p className="eyebrow">{t("tracking.timeline")}</p>
        {order ? (
          <>
            <h3>{order.orderNo}</h3>
            <div className="button-row" style={{ marginTop: 12 }}>
              <StatusBadge status={order.status} />
            </div>
            <p className="muted">{t("tracking.order.trackingNo", { trackingNo: order.trackingNo ?? t("common.pending") })}</p>
            <p className="muted">{t("orders.summary.reviewState", { value: t(`admin.reviewState.${order.reviewState}`) })}</p>
            {order.reviewFailureReason ? <p className={order.status === "REJECTED" ? "status danger" : "status"}>{order.reviewFailureReason}</p> : null}
            <div className="button-row">
              <Link className="button" href={`/logistics/orders/${order.id}`}>
                {t("tracking.result.gotoOrder")}
              </Link>
              {order.status === "REJECTED" ? (
                <a
                  className="button primary"
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Rejected logistics order ${order.orderNo}`)}`}
                >
                  <Headset aria-hidden="true" />
                  {t("orders.support.contact")}
                </a>
              ) : null}
            </div>
            <TrackingTimeline events={order.events} />
          </>
        ) : (
          <div className="empty-state">{t("tracking.noResult")}</div>
        )}
      </div>
    </div>
  );
}
