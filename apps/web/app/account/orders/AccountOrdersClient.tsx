"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LogisticsOrder, ShopOrder } from "@ground/shared";
import { StatusBadge } from "../../../components/StatusBadge";
import { useI18n } from "../../../components/I18nProvider";
import { getJson } from "../../../lib/api";
import { getActiveLocalUserProfile } from "../../../lib/local-user-profile";
import { formatAccountLogisticsQuote } from "./account-order-quotes";

function getOrderOwnerEmail() {
  return getActiveLocalUserProfile()?.email?.trim().toLowerCase() ?? "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatShopAmount(order: ShopOrder) {
  return `${order.totalAmount.toFixed(2)} ${order.currency}`;
}

export function AccountOrdersClient() {
  const { t } = useI18n();
  const [ownerEmail, setOwnerEmail] = useState("");
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [logisticsOrders, setLogisticsOrders] = useState<LogisticsOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async (email: string) => {
    setIsLoading(true);
    setError("");

    try {
      const [loadedShopOrders, loadedLogisticsOrders] = await Promise.all([
        getJson<ShopOrder[]>("/shop/orders"),
        getJson<LogisticsOrder[]>("/logistics/orders")
      ]);
      setShopOrders(loadedShopOrders);
      setLogisticsOrders(loadedLogisticsOrders);
    } catch (caught) {
      const fallback = caught instanceof Error ? caught.message : "Load failed";
      setError(t("account.orders.error", { message: fallback }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const email = getOrderOwnerEmail();
    setOwnerEmail(email);

    if (!email) {
      setIsLoading(false);
      return;
    }

    void loadOrders(email);
  }, []);

  if (!ownerEmail) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h2>{t("account.orders.loginTitle")}</h2>
          <p>{t("account.orders.loginBody")}</p>
          <Link className="button primary" href="/auth/login?next=/account/orders">
            {t("account.orders.loginAction")}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="empty-state">{t("account.orders.loading")}</div>;
  }

  if (error) {
    return (
      <div className="panel">
        <div className="empty-state">{error}</div>
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => void loadOrders(ownerEmail)}>
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-orders-stack">
      <section className="panel table-panel">
        <div className="table-actions">
          <h2>{t("account.orders.shopTitle")}</h2>
          <button className="button" type="button" onClick={() => void loadOrders(ownerEmail)}>
            {t("common.refresh")}
          </button>
        </div>
        {shopOrders.length === 0 ? (
          <div className="empty-state">{t("account.orders.emptyShop")}</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.orderNo")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.amount")}</th>
                  <th>{t("account.orders.createdAt")}</th>
                  <th>{t("common.action")}</th>
                </tr>
              </thead>
              <tbody>
                {shopOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.orderNo}</strong></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatShopAmount(order)}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td><Link className="button" href={`/shop/orders/${order.id}`}>{t("account.orders.viewDetail")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-actions">
          <h2>{t("account.orders.logisticsTitle")}</h2>
        </div>
        {logisticsOrders.length === 0 ? (
          <div className="empty-state">{t("account.orders.emptyLogistics")}</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.orderNo")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("account.orders.quote")}</th>
                  <th>{t("account.orders.createdAt")}</th>
                  <th>{t("common.action")}</th>
                </tr>
              </thead>
              <tbody>
                {logisticsOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNo}</strong>
                      <p className="soft">{order.recipient.city}, {order.recipient.country}</p>
                    </td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatAccountLogisticsQuote(order, t("account.orders.quotePending"))}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td><Link className="button" href={`/logistics/orders/${order.id}`}>{t("account.orders.viewDetail")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
