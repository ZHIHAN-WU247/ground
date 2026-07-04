"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RadioTower, RefreshCw, ShieldCheck } from "lucide-react";
import type { LogisticsOrder } from "@ground/shared";
import { StatusBadge } from "../../../../../components/StatusBadge";
import { TrackingTimeline } from "../../../../../components/TrackingTimeline";
import { useI18n } from "../../../../../components/I18nProvider";
import { getAdminJson, patchAdminJson, postAdminJson } from "../../../../../lib/api";

interface ReviewFormState {
  correctedWeightKg: string;
  correctedLengthCm: string;
  correctedWidthCm: string;
  correctedHeightCm: string;
  cdekTariffCode: string;
  reason: string;
}

interface ManualTrackingState {
  trackingNo: string;
  carrierReferenceNo: string;
}

const initialReviewForm: ReviewFormState = {
  correctedWeightKg: "",
  correctedLengthCm: "",
  correctedWidthCm: "",
  correctedHeightCm: "",
  cdekTariffCode: "",
  reason: ""
};

const initialManualTrackingState: ManualTrackingState = {
  trackingNo: "",
  carrierReferenceNo: ""
};

export function AdminLogisticsOrderDetailClient({ id }: { id: string }) {
  const { t } = useI18n();
  const [order, setOrder] = useState<LogisticsOrder | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(initialReviewForm);
  const [manualTracking, setManualTracking] = useState<ManualTrackingState>(initialManualTrackingState);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");
  const [handshakeMessage, setHandshakeMessage] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const canMarkInbound = order?.status === "APPROVED" && Boolean(order?.trackingNo);
  const needsTrackingFallback = !order?.trackingNo && Boolean(order?.carrierLastError);
  const canReview = order?.status === "UNDER_REVIEW";
  const canRequestLabel = Boolean(order?.carrierEntityUuid || order?.trackingNo);
  const canRefreshLabel = Boolean(order?.labelUuid);
  const canSyncTracking = Boolean(order?.trackingNo);

  const orderSummary = useMemo(() => {
    if (!order) {
      return "";
    }

    return `${order.weightKg}kg / ${order.lengthCm}x${order.widthCm}x${order.heightCm}cm / ${order.packageCount}`;
  }, [order]);

  const loadOrder = async () => {
    setIsLoading(true);

    try {
      const result = await getAdminJson<LogisticsOrder>(`/admin/logistics/orders/${encodeURIComponent(id)}`);
      setOrder(result);
      setReviewForm({
        correctedWeightKg: String(result.weightKg),
        correctedLengthCm: String(result.lengthCm),
        correctedWidthCm: String(result.widthCm),
        correctedHeightCm: String(result.heightCm),
        cdekTariffCode: result.cdekTariffCode ? String(result.cdekTariffCode) : "",
        reason: ""
      });
      setManualTracking({
        trackingNo: result.trackingNo ?? "",
        carrierReferenceNo: result.carrierReferenceNo ?? ""
      });
      setMessage("");
      setIsError(false);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setMessage(t("admin.logistics.detail.loadError", { message: fallback }));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [id]);

  useEffect(() => {
    if (!order || order.reviewState !== "APPROVED" || order.trackingNo || order.carrierCreateState !== "SUBMITTED") {
      return;
    }

    const timer = window.setInterval(() => {
      void loadOrder();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [order, id]);

  const updateReviewField = (field: keyof ReviewFormState, value: string) => {
    setReviewForm((current) => ({ ...current, [field]: value }));
  };

  const updateManualField = (field: keyof ManualTrackingState, value: string) => {
    setManualTracking((current) => ({ ...current, [field]: value }));
  };

  const parseOptionalPositiveNumber = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const getCarrierOutcomeMessage = (result: LogisticsOrder, successKey: "admin.logistics.detail.approveSuccess" | "admin.logistics.detail.retrySuccess") => {
    if (result.trackingNo) {
      return t(successKey);
    }

    if (result.carrierLastError) {
      return t("admin.logistics.detail.approveCarrierFollowup");
    }

    return t("admin.logistics.detail.approvePendingTracking");
  };

  const runAction = async (
    action: string,
    runner: () => Promise<LogisticsOrder>,
    getOutcome: (result: LogisticsOrder) => { isError: boolean; message: string }
  ) => {
    setActiveAction(action);
    setMessage("");
    setIsError(false);

    try {
      const result = await runner();
      setOrder(result);
      setManualTracking({
        trackingNo: result.trackingNo ?? "",
        carrierReferenceNo: result.carrierReferenceNo ?? ""
      });
      const outcome = getOutcome(result);
      setMessage(outcome.message);
      setIsError(outcome.isError);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Request failed";
      setMessage(t("admin.logistics.detail.actionError", { message: fallback }));
      setIsError(true);
    } finally {
      setActiveAction("");
    }
  };

  const runHandshake = async () => {
    setActiveAction("handshake");
    setHandshakeMessage("");

    try {
      const result = await getAdminJson<{
        environment: string;
        tokenType?: string;
        expiresIn?: number;
        scope?: string;
        sampleCity?: { code?: number; city?: string; countryCode?: string };
      }>("/admin/logistics/carrier/cdek/handshake");
      const city = result.sampleCity ? `${result.sampleCity.city ?? "city"} #${result.sampleCity.code ?? "-"}` : "no city sample";
      setHandshakeMessage(`CDEK ${result.environment} OK · ${result.tokenType ?? "token"} · ${result.expiresIn ?? 0}s · ${city}`);
      setIsError(false);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Handshake failed";
      setHandshakeMessage(`CDEK handshake failed: ${fallback}`);
      setIsError(true);
    } finally {
      setActiveAction("");
    }
  };

  if (isLoading) {
    return <div className="empty-state">{t("admin.logistics.detail.loading")}</div>;
  }

  if (!order) {
    return <div className="empty-state">{message || t("admin.logistics.detail.missing")}</div>;
  }

  return (
    <div className="grid two admin-order-layout">
      <div className="grid">
        <div className="panel">
          <div className="detail-head">
            <div>
              <p className="eyebrow">{order.orderNo}</p>
              <h3>{t("admin.logistics.detail.review")}</h3>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="muted">{t("admin.logistics.detail.summary", { trackingNo: order.trackingNo ?? t("common.pending") })}</p>
          <p>{t("admin.logistics.orders.reviewState", { value: t(`admin.reviewState.${order.reviewState}`) })}</p>
          <p>{t("admin.logistics.detail.cargoSummary", { value: orderSummary })}</p>
          {order.reviewFailureReason ? <p className="status danger">{order.reviewFailureReason}</p> : null}
          {message ? <p className={isError ? "status danger" : "status success"}>{message}</p> : null}
        </div>

        <div className="panel">
          <div className="detail-head">
            <div>
              <p className="eyebrow">CDEK</p>
              <h3>承运商握手与回传</h3>
            </div>
            <button className="button" type="button" disabled={activeAction !== ""} onClick={() => void runHandshake()}>
              <ShieldCheck aria-hidden="true" />
              {activeAction === "handshake" ? t("common.submitting") : "测试握手"}
            </button>
          </div>
          {handshakeMessage ? <p className={isError ? "status danger" : "status success"}>{handshakeMessage}</p> : null}
          <div className="carrier-grid">
            <div>
              <span className="soft">订单创建状态</span>
              <strong>{order.carrierCreateState ?? "NOT_SUBMITTED"}</strong>
            </div>
            <div>
              <span className="soft">CDEK entity.uuid</span>
              <strong>{order.carrierEntityUuid ?? t("common.pending")}</strong>
            </div>
            <div>
              <span className="soft">CDEK 运单号</span>
              <strong>{order.trackingNo ?? t("common.pending")}</strong>
            </div>
            <div>
              <span className="soft">面单状态</span>
              <strong>{order.labelStatus ?? "NOT_REQUESTED"}</strong>
            </div>
            <div>
              <span className="soft">面单 uuid</span>
              <strong>{order.labelUuid ?? t("common.pending")}</strong>
            </div>
            <div>
              <span className="soft">轨迹同步</span>
              <strong>{order.trackingSyncStatus ?? "NOT_STARTED"}</strong>
            </div>
          </div>
          {order.labelUrl ? (
            <a className="button" href={order.labelUrl} target="_blank" rel="noreferrer">
              <FileText aria-hidden="true" />
              打开 CDEK 面单 PDF
            </a>
          ) : null}
          {order.labelLastError ? <p className="status danger">{order.labelLastError}</p> : null}
          {order.carrierLastError ? <p className="status danger">{order.carrierLastError}</p> : null}
          <div className="button-row">
            <button
              className="button primary"
              type="button"
              disabled={!canRequestLabel || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "label",
                  () => postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/cdek/label`, {}),
                  (result) => ({
                    isError: result.labelStatus === "FAILED",
                    message: result.labelStatus === "FAILED" ? "CDEK 面单生成失败。" : "CDEK 面单请求已提交。"
                  })
                )
              }
            >
              <FileText aria-hidden="true" />
              {activeAction === "label" ? t("common.submitting") : "生成面单"}
            </button>
            <button
              className="button"
              type="button"
              disabled={!canRefreshLabel || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "label-refresh",
                  () => postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/cdek/label/refresh`, {}),
                  (result) => ({
                    isError: result.labelStatus === "FAILED",
                    message: result.labelUrl ? "CDEK 面单已就绪。" : "CDEK 面单状态已刷新。"
                  })
                )
              }
            >
              <RefreshCw aria-hidden="true" />
              {activeAction === "label-refresh" ? t("common.submitting") : "刷新面单"}
            </button>
            <button
              className="button"
              type="button"
              disabled={!canSyncTracking || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "tracking-sync",
                  () => postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/cdek/tracking/sync`, {}),
                  (result) => ({
                    isError: result.trackingSyncStatus === "FAILED",
                    message: result.trackingSyncStatus === "FAILED" ? "CDEK 轨迹同步失败。" : "CDEK 尾端轨迹已同步。"
                  })
                )
              }
            >
              <RadioTower aria-hidden="true" />
              {activeAction === "tracking-sync" ? t("common.submitting") : "同步尾端物流"}
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>{t("admin.logistics.detail.reviewActionTitle")}</h3>
          <p className="muted">{t("admin.logistics.detail.reviewNote")}</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="correctedWeightKg">{t("admin.logistics.detail.correctedWeight")}</label>
              <input id="correctedWeightKg" type="number" min="0.1" step="0.1" value={reviewForm.correctedWeightKg} onChange={(event) => updateReviewField("correctedWeightKg", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="correctedLengthCm">{t("admin.logistics.detail.correctedLength")}</label>
              <input id="correctedLengthCm" type="number" min="1" value={reviewForm.correctedLengthCm} onChange={(event) => updateReviewField("correctedLengthCm", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="correctedWidthCm">{t("admin.logistics.detail.correctedWidth")}</label>
              <input id="correctedWidthCm" type="number" min="1" value={reviewForm.correctedWidthCm} onChange={(event) => updateReviewField("correctedWidthCm", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="correctedHeightCm">{t("admin.logistics.detail.correctedHeight")}</label>
              <input id="correctedHeightCm" type="number" min="1" value={reviewForm.correctedHeightCm} onChange={(event) => updateReviewField("correctedHeightCm", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cdekTariffCode">{t("admin.logistics.detail.cdekTariffCode")}</label>
              <input id="cdekTariffCode" type="number" min="1" value={reviewForm.cdekTariffCode} onChange={(event) => updateReviewField("cdekTariffCode", event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="reviewReason">{t("admin.logistics.detail.reviewReason")}</label>
              <textarea id="reviewReason" rows={4} value={reviewForm.reason} onChange={(event) => updateReviewField("reason", event.target.value)} />
            </div>
          </div>
          <div className="button-row">
            <button
              className="button primary"
              type="button"
              disabled={!canReview || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "approve",
                  () =>
                    patchAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/review`, {
                      decision: "APPROVE",
                      reason: reviewForm.reason.trim() || undefined,
                      correctedWeightKg: parseOptionalPositiveNumber(reviewForm.correctedWeightKg),
                      correctedLengthCm: parseOptionalPositiveNumber(reviewForm.correctedLengthCm),
                      correctedWidthCm: parseOptionalPositiveNumber(reviewForm.correctedWidthCm),
                      correctedHeightCm: parseOptionalPositiveNumber(reviewForm.correctedHeightCm),
                      cdekTariffCode: parseOptionalPositiveNumber(reviewForm.cdekTariffCode)
                    }),
                  (result) => ({
                    isError: false,
                    message: getCarrierOutcomeMessage(result, "admin.logistics.detail.approveSuccess")
                  })
                )
              }
            >
              {activeAction === "approve" ? t("common.submitting") : t("admin.logistics.detail.approve")}
            </button>
            <button
              className="button"
              type="button"
              disabled={!canReview || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "reject",
                  () =>
                    patchAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/review`, {
                      decision: "REJECT",
                      reason: reviewForm.reason.trim() || t("admin.logistics.detail.rejectDefaultReason"),
                      correctedWeightKg: parseOptionalPositiveNumber(reviewForm.correctedWeightKg),
                      correctedLengthCm: parseOptionalPositiveNumber(reviewForm.correctedLengthCm),
                      correctedWidthCm: parseOptionalPositiveNumber(reviewForm.correctedWidthCm),
                      correctedHeightCm: parseOptionalPositiveNumber(reviewForm.correctedHeightCm),
                      cdekTariffCode: parseOptionalPositiveNumber(reviewForm.cdekTariffCode)
                    }),
                  () => ({
                    isError: false,
                    message: t("admin.logistics.detail.rejectSuccess")
                  })
                )
              }
            >
              {activeAction === "reject" ? t("common.submitting") : t("admin.logistics.detail.reject")}
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>{t("admin.logistics.detail.fallbackTitle")}</h3>
          <p className="muted">{t("admin.logistics.detail.fallbackNote")}</p>
          {needsTrackingFallback ? <p className="status danger">{t("admin.logistics.detail.fallbackNeeded")}</p> : null}
          <div className="button-row">
            <button
              className="button"
              type="button"
              disabled={!!order.trackingNo || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "retry",
                  () => postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/review/retry-tracking`, {}),
                  (result) => ({
                    isError: false,
                    message: getCarrierOutcomeMessage(result, "admin.logistics.detail.retrySuccess")
                  })
                )
              }
            >
              {activeAction === "retry" ? t("common.submitting") : t("admin.logistics.detail.retry")}
            </button>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="trackingNo">{t("admin.logistics.detail.manualTrackingNo")}</label>
              <input id="trackingNo" value={manualTracking.trackingNo} onChange={(event) => updateManualField("trackingNo", event.target.value)} placeholder="GLB..." />
            </div>
            <div className="field">
              <label htmlFor="carrierReferenceNo">{t("admin.logistics.detail.manualCarrierReferenceNo")}</label>
              <input id="carrierReferenceNo" value={manualTracking.carrierReferenceNo} onChange={(event) => updateManualField("carrierReferenceNo", event.target.value)} placeholder="CR..." />
            </div>
          </div>
          <div className="button-row">
            <button
              className="button primary"
              type="button"
              disabled={!!order.trackingNo || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "manual",
                  () =>
                    postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/review/manual-tracking`, {
                      trackingNo: manualTracking.trackingNo.trim(),
                      carrierReferenceNo: manualTracking.carrierReferenceNo.trim()
                    }),
                  () => ({
                    isError: false,
                    message: t("admin.logistics.detail.manualSuccess")
                  })
                )
              }
            >
              {activeAction === "manual" ? t("common.submitting") : t("admin.logistics.detail.manualSubmit")}
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>{t("admin.logistics.detail.inboundTitle")}</h3>
          <p className="muted">{t("admin.logistics.detail.inboundNote")}</p>
          <div className="button-row">
            <button
              className="button primary"
              type="button"
              disabled={!canMarkInbound || activeAction !== ""}
              onClick={() =>
                void runAction(
                  "inbound",
                  () => postAdminJson<LogisticsOrder, object>(`/admin/logistics/orders/${order.id}/inbound`, {}),
                  () => ({
                    isError: false,
                    message: t("admin.logistics.detail.inboundSuccess")
                  })
                )
              }
            >
              {activeAction === "inbound" ? t("common.submitting") : t("admin.logistics.detail.markInbound")}
            </button>
            <button className="button" type="button" onClick={() => void loadOrder()} disabled={activeAction !== ""}>
              {t("common.refresh")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>{t("admin.logistics.detail.opsTracking")}</h3>
          <p className="muted">{t("admin.logistics.detail.opsTrackingNote")}</p>
          <TrackingTimeline events={order.events} />
        </div>
      </div>
    </div>
  );
}
