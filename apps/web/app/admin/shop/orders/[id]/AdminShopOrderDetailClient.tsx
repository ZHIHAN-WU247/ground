"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import type { ShopOrder } from "@ground/shared";
import { StatusBadge } from "../../../../../components/StatusBadge";
import { getAdminJson, patchAdminJson } from "../../../../../lib/api";

export function AdminShopOrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setOrder(await getAdminJson<ShopOrder>(`/admin/shop/orders/${encodeURIComponent(id)}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "订单加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  const updateStatus = async (status: "CANCELLED" | "CONFIRMED") => {
    if (!order) return;
    setIsUpdating(true);
    setError("");
    try {
      setOrder(await patchAdminJson<ShopOrder, { status: "CANCELLED" | "CONFIRMED" }>(
        `/admin/shop/orders/${encodeURIComponent(order.id)}/status`,
        { status }
      ));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "订单状态更新失败。");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="empty-state">正在加载订单详情…</div>;
  if (!order) {
    return <div className="empty-state"><p>{error || "没有找到该订单。"}</p><button className="button" type="button" onClick={() => void loadOrder()}><RefreshCw size={16} />重试</button></div>;
  }

  return (
    <div className="admin-shop-order-detail">
      <main className="admin-shop-order-detail-main">
        <section className="admin-shop-order-detail-card">
          <div className="admin-shop-order-detail-heading"><div><span>订单号</span><h2>{order.orderNo}</h2></div><StatusBadge status={order.status} /></div>
          <small>创建时间：{new Date(order.createdAt).toLocaleString()}</small>
        </section>

        <section className="admin-shop-order-detail-card">
          <h2>商品明细</h2>
          <div className="admin-shop-order-items">
            {order.items.map((item) => (
              <article key={`${item.productId}-${item.skuId}`}>
                <img src={item.productImageUrl} alt={item.productName} />
                <div><strong>{item.productName}</strong><span>{item.skuModel} · {item.skuSize}</span><small>{item.unitPrice} {order.currency} × {item.quantity}</small></div>
                <strong>{item.unitPrice * item.quantity} {order.currency}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-shop-order-detail-card">
          <h2>收件信息</h2>
          <dl className="admin-shop-order-recipient">
            <div><dt>收件人</dt><dd>{order.recipient.name}</dd></div>
            <div><dt>电话</dt><dd>{order.recipient.phone}</dd></div>
            <div><dt>邮箱</dt><dd>{order.recipient.email || "—"}</dd></div>
            <div><dt>国家/地区</dt><dd>{order.recipient.country}</dd></div>
            <div><dt>省/州</dt><dd>{order.recipient.province}</dd></div>
            <div><dt>城市</dt><dd>{order.recipient.city}</dd></div>
            <div><dt>邮编</dt><dd>{order.recipient.postalCode}</dd></div>
            <div className="full"><dt>详细地址</dt><dd>{order.recipient.addressLine}</dd></div>
          </dl>
        </section>
      </main>

      <aside className="admin-shop-order-review">
        <span>订单金额</span>
        <strong>{order.totalAmount} {order.currency}</strong>
        <p>确认前请核对商品、规格、数量和收件信息。</p>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        {order.status === "PENDING_CONFIRMATION" ? (
          <>
            <button className="button primary" disabled={isUpdating} type="button" onClick={() => void updateStatus("CONFIRMED")}><Check size={16} />{isUpdating ? "处理中" : "确认订单"}</button>
            <button className="button" disabled={isUpdating} type="button" onClick={() => void updateStatus("CANCELLED")}><X size={16} />取消订单</button>
          </>
        ) : null}
        {order.status === "CONFIRMED" ? (
          <div className="admin-shop-logistics-link pending">
            <span><Truck size={16} />已流转到物流管理</span>
            <p>物流人员将在物流管理中补齐申报和包裹资料。</p>
            <Link className="button primary" href={`/admin/logistics/shop-orders/${order.id}`}>
              前往物流管理
            </Link>
          </div>
        ) : null}
        {order.status === "LINKED_TO_LOGISTICS" ? (
          <div className="admin-shop-logistics-link">
            <span><PackageCheck size={16} />已生成物流订单</span>
            <strong>{order.logisticsReferenceNo}</strong>
            {order.logisticsOrderId ? (
              <Link className="button primary" href={`/admin/logistics/orders/${order.logisticsOrderId}`}>
                查看物流订单
              </Link>
            ) : null}
          </div>
        ) : null}
        <Link className="button" href="/admin/shop/orders">返回订单列表</Link>
      </aside>
    </div>
  );
}
