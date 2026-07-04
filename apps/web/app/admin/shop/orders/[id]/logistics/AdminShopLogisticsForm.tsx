"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, PackageCheck, RefreshCw, Truck } from "lucide-react";
import type { LogisticsOrder, ShopOrder } from "@ground/shared";
import { getAdminJson, postAdminJson } from "../../../../../../lib/api";
import {
  buildShopLogisticsRequest,
  createShopLogisticsFormState,
  type ShopLogisticsFormState,
  type ShopLogisticsRequest
} from "./shop-logistics-form";

type BridgeResponse = {
  shopOrder: ShopOrder;
  logisticsOrder: LogisticsOrder;
};

export function AdminShopLogisticsForm({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [form, setForm] = useState<ShopLogisticsFormState | null>(null);
  const [result, setResult] = useState<BridgeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const loadedOrder = await getAdminJson<ShopOrder>(
        `/admin/shop/orders/${encodeURIComponent(orderId)}`
      );
      setOrder(loadedOrder);
      setForm(createShopLogisticsFormState(loadedOrder));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "订单加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const updateField = <Key extends keyof ShopLogisticsFormState>(
    key: Key,
    value: ShopLogisticsFormState[Key]
  ) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!order || !form) return;
    setIsSubmitting(true);
    setError("");

    try {
      const payload = buildShopLogisticsRequest(form, order);
      const response = await postAdminJson<BridgeResponse, ShopLogisticsRequest>(
        `/admin/shop/orders/${encodeURIComponent(order.id)}/logistics`,
        payload
      );
      setResult(response);
      setOrder(response.shopOrder);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交物流失败，请检查后重试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="empty-state">正在加载商城订单…</div>;
  }

  if (!order || !form) {
    return (
      <div className="empty-state">
        <p>{error || "没有找到该订单。"}</p>
        <button className="button" type="button" onClick={() => void loadOrder()}>
          <RefreshCw size={16} />重新加载
        </button>
      </div>
    );
  }

  if (result || order.status === "LINKED_TO_LOGISTICS") {
    const logisticsOrderId = result?.logisticsOrder.id ?? order.logisticsOrderId;
    const logisticsOrderNo = result?.logisticsOrder.orderNo ?? order.logisticsReferenceNo;

    return (
      <div className="shop-logistics-success">
        <CheckCircle2 size={42} />
        <span>物流交接完成</span>
        <h2>{logisticsOrderNo}</h2>
        <p>商城订单已锁定关联，物流订单已进入物流后台待审核队列。</p>
        <div className="button-row">
          {logisticsOrderId ? (
            <Link className="button primary" href={`/admin/logistics/orders/${logisticsOrderId}`}>
              查看物流订单<ArrowRight size={16} />
            </Link>
          ) : null}
          <Link className="button" href={`/admin/shop/orders/${order.id}`}>返回商城订单</Link>
        </div>
      </div>
    );
  }

  if (order.status !== "CONFIRMED") {
    return (
      <div className="empty-state">
        <p>只有已经人工确认的商城订单才能提交到物流后台。</p>
        <Link className="button primary" href={`/admin/shop/orders/${order.id}`}>返回确认订单</Link>
      </div>
    );
  }

  return (
    <form className="shop-logistics-layout" onSubmit={submit}>
      <main className="shop-logistics-form">
        <div className="shop-logistics-track" aria-label="订单处理进度">
          <span className="done"><CheckCircle2 size={16} />客户已下单</span>
          <span className="done"><CheckCircle2 size={16} />商城已确认</span>
          <span className="active"><Truck size={16} />补齐物流资料</span>
          <span><PackageCheck size={16} />物流待审核</span>
        </div>

        <section className="shop-logistics-card">
          <div className="shop-logistics-section-heading">
            <span>01</span>
            <div><h2>路线与寄件人</h2><p>收件人由商城订单自动带入，避免二次录入。</p></div>
          </div>
          <div className="form-grid">
            <label>
              物流路线
              <select value={form.routeId} onChange={(event) => updateField("routeId", event.target.value as ShopLogisticsFormState["routeId"])}>
                <option value="air-cdek">空运 · CDEK</option>
                <option value="air-ems">空运 · EMS</option>
                <option value="land-cdek">陆运 · CDEK</option>
                <option value="land-russia-post">陆运 · 俄罗斯邮政</option>
              </select>
            </label>
            <label>寄件人<input value={form.senderName} onChange={(event) => updateField("senderName", event.target.value)} /></label>
            <label>寄件电话<input value={form.senderPhone} onChange={(event) => updateField("senderPhone", event.target.value)} /></label>
            <label>寄件邮箱（选填）<input type="email" value={form.senderEmail} onChange={(event) => updateField("senderEmail", event.target.value)} /></label>
            <label>国家<input value={form.senderCountry} onChange={(event) => updateField("senderCountry", event.target.value)} /></label>
            <label>省 / 州<input value={form.senderProvince} onChange={(event) => updateField("senderProvince", event.target.value)} /></label>
            <label>城市<input value={form.senderCity} onChange={(event) => updateField("senderCity", event.target.value)} /></label>
            <label>邮编<input value={form.senderPostalCode} onChange={(event) => updateField("senderPostalCode", event.target.value)} /></label>
            <label className="full">详细地址<input value={form.senderAddressLine} onChange={(event) => updateField("senderAddressLine", event.target.value)} /></label>
          </div>
        </section>

        <section className="shop-logistics-card">
          <div className="shop-logistics-section-heading">
            <span>02</span>
            <div><h2>商品申报</h2><p>商城售价不会自动换汇，请填写每件商品的人民币申报单价。</p></div>
          </div>
          <div className="shop-logistics-declarations">
            {order.items.map((item) => {
              const key = `${item.productId}:${item.skuId}`;
              return (
                <article key={key}>
                  <img src={item.productImageUrl} alt="" />
                  <div>
                    <strong>{item.productName}</strong>
                    <small>{item.skuModel} · {item.skuSize} · 数量 {item.quantity}</small>
                  </div>
                  <label>
                    人民币单价
                    <span><input min="0.01" step="0.01" type="number" value={form.itemDeclaredValues[key] ?? ""} onChange={(event) => updateField("itemDeclaredValues", { ...form.itemDeclaredValues, [key]: event.target.value })} /> CNY</span>
                  </label>
                </article>
              );
            })}
          </div>
          <label className="shop-logistics-document">
            收件人税号 / 身份证件号
            <input value={form.taxIdOrDocumentNo} onChange={(event) => updateField("taxIdOrDocumentNo", event.target.value)} />
          </label>
        </section>

        <section className="shop-logistics-card">
          <div className="shop-logistics-section-heading">
            <span>03</span>
            <div><h2>包裹数据</h2><p>用于计费预估和物流后台审核。</p></div>
          </div>
          <div className="shop-logistics-measurements">
            <label>重量（kg）<input min="0.01" step="0.01" type="number" value={form.weightKg} onChange={(event) => updateField("weightKg", event.target.value)} /></label>
            <label>长（cm）<input min="0.01" step="0.01" type="number" value={form.lengthCm} onChange={(event) => updateField("lengthCm", event.target.value)} /></label>
            <label>宽（cm）<input min="0.01" step="0.01" type="number" value={form.widthCm} onChange={(event) => updateField("widthCm", event.target.value)} /></label>
            <label>高（cm）<input min="0.01" step="0.01" type="number" value={form.heightCm} onChange={(event) => updateField("heightCm", event.target.value)} /></label>
            <label>包裹数<input min="1" step="1" type="number" value={form.packageCount} onChange={(event) => updateField("packageCount", event.target.value)} /></label>
          </div>
        </section>
      </main>

      <aside className="shop-logistics-handoff">
        <span>商城 → 物流</span>
        <h2>{order.orderNo}</h2>
        <dl>
          <div><dt>收件人</dt><dd>{order.recipient.name}</dd></div>
          <div><dt>目的地</dt><dd>{order.recipient.country} · {order.recipient.city}</dd></div>
          <div><dt>商品</dt><dd>{order.items.reduce((total, item) => total + item.quantity, 0)} 件</dd></div>
          <div><dt>商城金额</dt><dd>{order.totalAmount} {order.currency}</dd></div>
        </dl>
        <p>提交后会生成一张待审核物流订单，商城订单将不能再次提交。</p>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button primary" disabled={isSubmitting} type="submit">
          <Truck size={17} />{isSubmitting ? "正在生成物流订单…" : "确认提交物流后台"}
        </button>
        <Link className="button" href={`/admin/shop/orders/${order.id}`}>暂不提交</Link>
      </aside>
    </form>
  );
}
