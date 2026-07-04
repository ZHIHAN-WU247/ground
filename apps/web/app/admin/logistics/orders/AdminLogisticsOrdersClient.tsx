"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
import type { LogisticsOrder, LogisticsStatusGroup, ShopOrder } from "@ground/shared";
import { StatusBadge } from "../../../../components/StatusBadge";
import { useI18n } from "../../../../components/I18nProvider";
import { getAdminJson } from "../../../../lib/api";

const statusGroupOptions: LogisticsStatusGroup[] = ["ALL", "REVIEW_QUEUE", "PENDING_SHIPMENT", "INTERNATIONAL_TRANSIT", "LAST_MILE", "COMPLETED", "ATTENTION"];

export function AdminLogisticsOrdersClient() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [shopHandoffs, setShopHandoffs] = useState<ShopOrder[]>([]);
  const [statusGroup, setStatusGroup] = useState<LogisticsStatusGroup>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasPendingTrackingNumber = orders.some((order) => order.reviewState === "APPROVED" && !order.trackingNo && order.carrierCreateState === "SUBMITTED");

  const loadOrders = async (nextGroup: LogisticsStatusGroup) => {
    setIsLoading(true);
    setError("");

    try {
      const query = nextGroup === "ALL" ? "" : `?statusGroup=${encodeURIComponent(nextGroup)}`;
      const [logisticsOrders, handoffs] = await Promise.all([
        getAdminJson<LogisticsOrder[]>(`/admin/logistics/orders${query}`),
        getAdminJson<ShopOrder[]>("/admin/shop/orders/logistics-handoffs")
      ]);
      setOrders(logisticsOrders);
      setShopHandoffs(handoffs);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setError(t("admin.logistics.orders.error", { message: fallback }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders(statusGroup);
  }, [statusGroup]);

  useEffect(() => {
    if (!hasPendingTrackingNumber) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadOrders(statusGroup);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [hasPendingTrackingNumber, statusGroup]);

  if (isLoading) {
    return <div className="empty-state">{t("admin.logistics.orders.loading")}</div>;
  }

  if (error) {
    return (
      <div className="panel">
        <div className="empty-state">{error}</div>
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => void loadOrders(statusGroup)}>
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-logistics-workspace">
      <section className="shop-handoff-queue">
        <div className="shop-handoff-heading">
          <div>
            <span>商城待交接</span>
            <h2>电商已确认，等待生成物流单</h2>
            <p>这里仅显示已由电商管理确认、尚未生成物流订单的商城订单。</p>
          </div>
          <strong>{shopHandoffs.length}</strong>
        </div>
        {shopHandoffs.length === 0 ? (
          <div className="shop-handoff-empty"><PackageCheck size={20} />当前没有待交接商城订单</div>
        ) : (
          <div className="shop-handoff-list">
            {shopHandoffs.map((order) => (
              <article key={order.id}>
                <div>
                  <span>电商已确认</span>
                  <strong>{order.orderNo}</strong>
                  <small>{new Date(order.createdAt).toLocaleString()}</small>
                </div>
                <dl>
                  <div><dt>收件人</dt><dd>{order.recipient.name}</dd></div>
                  <div><dt>目的地</dt><dd>{order.recipient.country} · {order.recipient.city}</dd></div>
                  <div><dt>商品</dt><dd>{order.items.reduce((total, item) => total + item.quantity, 0)} 件</dd></div>
                  <div><dt>商城金额</dt><dd>{order.totalAmount} {order.currency}</dd></div>
                </dl>
                <Link className="button primary" href={`/admin/logistics/shop-orders/${order.id}`}>
                  完善物流资料<ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="panel table-panel">
      <div className="table-actions table-actions-stacked">
        <div>
          <p className="muted">{t("admin.logistics.orders.count", { count: orders.length })}</p>
        </div>
        <div className="status-filter-bar" role="tablist" aria-label={t("admin.logistics.orders.filterLabel")}>
          {statusGroupOptions.map((option) => (
            <button
              key={option}
              className={`status-filter-pill${statusGroup === option ? " active" : ""}`}
              type="button"
              onClick={() => setStatusGroup(option)}
            >
              {t(`admin.logistics.orders.filter.${option}`)}
            </button>
          ))}
          <button className="button" type="button" onClick={() => void loadOrders(statusGroup)}>
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">{t("admin.logistics.orders.emptyFiltered")}</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>{t("common.orderNo")}</th>
                <th>{t("admin.logistics.orders.submitted")}</th>
                <th>{t("admin.logistics.orders.recipientInfo")}</th>
                <th>{t("admin.logistics.orders.cargoData")}</th>
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
                    <p className="soft">{t("admin.logistics.orders.reviewState", { value: t(`admin.reviewState.${order.reviewState}`) })}</p>
                    <p className="soft">CDEK: {order.carrierCreateState ?? "NOT_SUBMITTED"} / Label: {order.labelStatus ?? "NOT_REQUESTED"}</p>
                  </td>
                  <td>
                    <strong>{order.cargoType}</strong>
                    <p className="soft">{t("admin.logistics.orders.sender", { name: order.sender.name, city: order.sender.city })}</p>
                  </td>
                  <td>
                    <strong>{order.recipient.name}</strong>
                    <p className="soft">{order.recipient.country} / {order.recipient.city} / {order.recipient.postalCode}</p>
                  </td>
                  <td>
                    <strong>{order.goodsName}</strong>
                    <p className="soft">{order.weightKg}kg / {order.lengthCm}x{order.widthCm}x{order.heightCm}cm / {order.packageCount}</p>
                    <p className="soft">{t("admin.logistics.orders.declared", { value: order.declaredValue, currency: order.declaredCurrency, document: order.taxIdOrDocumentNo })}</p>
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <Link className="button" href={`/admin/logistics/orders/${order.id}`}>
                      {t("common.process")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
