"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw, Search, X } from "lucide-react";
import type { ShopOrder, ShopOrderStatus } from "@ground/shared";
import { StatusBadge } from "../../../../components/StatusBadge";
import { getAdminJson, patchAdminJson } from "../../../../lib/api";

type StatusFilter = "ALL" | ShopOrderStatus;

export function AdminShopOrdersClient() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setOrders(await getAdminJson<ShopOrder[]>("/admin/shop/orders"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "订单加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const matchesKeyword = !normalized || [order.orderNo, order.recipient.name, order.recipient.phone, order.recipient.email ?? ""]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, orders, statusFilter]);

  const updateStatus = async (order: ShopOrder, status: "CANCELLED" | "CONFIRMED") => {
    setActiveOrderId(order.id);
    setError("");
    try {
      const updated = await patchAdminJson<ShopOrder, { status: "CANCELLED" | "CONFIRMED" }>(
        `/admin/shop/orders/${encodeURIComponent(order.id)}/status`,
        { status }
      );
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "订单状态更新失败。");
    } finally {
      setActiveOrderId("");
    }
  };

  if (isLoading) return <div className="empty-state">正在加载商城订单…</div>;
  if (error && orders.length === 0) {
    return <div className="empty-state"><p>{error}</p><button className="button" type="button" onClick={() => void loadOrders()}><RefreshCw size={16} />重新加载</button></div>;
  }

  return (
    <div className="admin-shop-orders">
      <div className="admin-shop-order-toolbar">
        <label className="admin-shop-order-search">
          <Search size={18} />
          <input aria-label="搜索订单" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="订单号、收件人、电话或邮箱" />
        </label>
        <label className="admin-shop-order-filter">
          <span>订单状态</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="ALL">全部状态</option>
            <option value="PENDING_CONFIRMATION">待确认</option>
            <option value="CONFIRMED">已确认</option>
            <option value="CANCELLED">已取消</option>
            <option value="LINKED_TO_LOGISTICS">已生成物流单</option>
          </select>
        </label>
        <strong>{filteredOrders.length} / {orders.length} 笔订单</strong>
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      {filteredOrders.length === 0 ? (
        <div className="empty-state">没有符合当前条件的订单。</div>
      ) : (
        <div className="admin-shop-order-list">
          <div className="admin-shop-order-head"><span>订单</span><span>收件人</span><span>金额</span><span>状态</span><span>操作</span></div>
          {filteredOrders.map((order) => {
            const isActive = activeOrderId === order.id;

            return (
              <article className="admin-shop-order-row" key={order.id}>
                <span className="admin-shop-order-number"><strong>{order.orderNo}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></span>
                <span><strong>{order.recipient.name}</strong><small>{order.recipient.phone}</small></span>
                <strong>{order.totalAmount} {order.currency}</strong>
                <StatusBadge status={order.status} />
                <div className="admin-shop-order-actions">
                  <Link className="button" href={`/admin/shop/orders/${order.id}`}>查看详情</Link>
                  {order.status === "PENDING_CONFIRMATION" ? (
                    <>
                      <button className="button primary" disabled={isActive} type="button" onClick={() => void updateStatus(order, "CONFIRMED")}><Check size={15} />{isActive ? "处理中" : "确认订单"}</button>
                      <button className="button" disabled={isActive} type="button" onClick={() => void updateStatus(order, "CANCELLED")}><X size={15} />取消</button>
                    </>
                  ) : null}
                  {order.status === "CONFIRMED" ? (
                    <Link className="button primary" href={`/admin/logistics/shop-orders/${order.id}`}>已转物流管理</Link>
                  ) : null}
                  {order.status === "LINKED_TO_LOGISTICS" && order.logisticsOrderId ? (
                    <Link className="button" href={`/admin/logistics/orders/${order.logisticsOrderId}`}>查看物流单</Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
