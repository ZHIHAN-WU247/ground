"use client";

import { useEffect, useState } from "react";
import type { CurrencyCode, LogisticsDeliveryMethod, LogisticsPricingFormula, LogisticsPricingRouteConfig } from "@ground/shared";
import { defaultLogisticsPricingRouteConfigs } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { listAdminPricingRouteConfigs, updateAdminPricingRouteConfig } from "../../../../lib/logistics-pricing-api";

const formulaOptions: LogisticsPricingFormula[] = ["half_kg_step", "cdek_first_last_mile", "per_kg"];
const deliveryMethodOptions: LogisticsDeliveryMethod[] = ["TO_DOOR", "TO_WAREHOUSE"];
const currencyOptions: CurrencyCode[] = ["CNY", "USD", "RUB"];

export function AdminPricingClient() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<LogisticsPricingRouteConfig[]>(defaultLogisticsPricingRouteConfigs);
  const [message, setMessage] = useState("");
  const [savingRouteId, setSavingRouteId] = useState("");

  useEffect(() => {
    void listAdminPricingRouteConfigs()
      .then(setConfigs)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load pricing routes."));
  }, []);

  const updateConfig = <K extends keyof LogisticsPricingRouteConfig>(routeId: string, field: K, value: LogisticsPricingRouteConfig[K]) => {
    setConfigs((current) => current.map((config) => (config.routeId === routeId ? { ...config, [field]: value } : config)));
  };

  const saveConfig = async (config: LogisticsPricingRouteConfig) => {
    setSavingRouteId(config.routeId);
    setMessage("");

    try {
      const saved = await updateAdminPricingRouteConfig(config.routeId, config);
      setConfigs((current) => current.map((item) => (item.routeId === saved.routeId ? saved : item)));
      setMessage("Pricing route saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingRouteId("");
    }
  };

  return (
    <div className="admin-pricing-layout">
      <div className="form-section-heading">
        <p className="eyebrow">{t("admin.logistics.pricing.eyebrow")}</p>
        <h1>{t("admin.logistics.pricing.title")}</h1>
        <p className="muted">{t("admin.logistics.pricing.description")}</p>
      </div>
      <div className="grid">
        {configs.map((config) => (
          <article className="card" key={config.routeId}>
            <div className="detail-head">
              <div>
                <h3>{t(config.labelKey)}</h3>
                <p>{config.routeId}</p>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={config.isActive} onChange={(event) => updateConfig(config.routeId, "isActive", event.target.checked)} />
                <span>Active</span>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Delivery</span>
                <select value={config.deliveryMethod} onChange={(event) => updateConfig(config.routeId, "deliveryMethod", event.target.value as LogisticsDeliveryMethod)}>
                  {deliveryMethodOptions.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Formula</span>
                <select value={config.formula} onChange={(event) => updateConfig(config.routeId, "formula", event.target.value as LogisticsPricingFormula)}>
                  {formulaOptions.map((formula) => <option key={formula} value={formula}>{formula}</option>)}
                </select>
              </label>
              <NumberField label="Sort" value={config.sortOrder} onChange={(value) => updateConfig(config.routeId, "sortOrder", value)} />
              <label className="field">
                <span>Currency</span>
                <select value={config.currency} onChange={(event) => updateConfig(config.routeId, "currency", event.target.value as CurrencyCode)}>
                  {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <NumberField label="Half kg unit" value={config.halfKgUnit} onChange={(value) => updateConfig(config.routeId, "halfKgUnit", value)} />
              <NumberField label="Base amount" value={config.baseAmount ?? 0} onChange={(value) => updateConfig(config.routeId, "baseAmount", value)} />
              <NumberField label="Step amount" value={config.stepAmount ?? 0} onChange={(value) => updateConfig(config.routeId, "stepAmount", value)} />
              <NumberField label="First mile / kg" value={config.firstMileCnyPerKg ?? 0} onChange={(value) => updateConfig(config.routeId, "firstMileCnyPerKg", value)} />
              <NumberField label="Per kg amount" value={config.perKgAmount ?? 0} onChange={(value) => updateConfig(config.routeId, "perKgAmount", value)} />
              <NumberField label="RUB/CNY" value={config.rubPerCny ?? 11} onChange={(value) => updateConfig(config.routeId, "rubPerCny", value)} />
            </div>
            <div className="button-row">
              <button className="button primary" type="button" onClick={() => saveConfig(config)} disabled={savingRouteId === config.routeId}>
                {savingRouteId === config.routeId ? "Saving..." : "Save"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className={message.includes("failed") || message.includes("required") ? "status danger" : "status success"}>{message}</p> : null}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
