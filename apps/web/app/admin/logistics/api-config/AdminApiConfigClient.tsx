"use client";

import { useEffect, useState } from "react";
import type { CarrierApiConfig } from "@ground/shared";
import { defaultCarrierApiConfigs } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import { listAdminCarrierConfigs, updateAdminCarrierConfig } from "../../../../lib/carrier-config-api";

export function AdminApiConfigClient() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<CarrierApiConfig[]>(defaultCarrierApiConfigs);
  const [message, setMessage] = useState("");
  const [savingProvider, setSavingProvider] = useState("");

  useEffect(() => {
    void listAdminCarrierConfigs().then(setConfigs);
  }, []);

  const updateConfig = <K extends keyof CarrierApiConfig>(providerCode: string, field: K, value: CarrierApiConfig[K]) => {
    setConfigs((current) => current.map((config) => (config.providerCode === providerCode ? { ...config, [field]: value } : config)));
  };

  const updateMetadata = (providerCode: string, value: string) => {
    setConfigs((current) => current.map((config) => {
      if (config.providerCode !== providerCode) {
        return config;
      }

      try {
        return { ...config, metadata: JSON.parse(value) as Record<string, unknown> };
      } catch {
        return { ...config, metadata: { raw: value } };
      }
    }));
  };

  const saveConfig = async (config: CarrierApiConfig) => {
    setSavingProvider(config.providerCode);
    setMessage("");

    try {
      const saved = await updateAdminCarrierConfig(config.providerCode, {
        displayName: config.displayName,
        apiBaseUrl: config.apiBaseUrl,
        credentialRef: config.credentialRef,
        isActive: config.isActive,
        metadata: config.metadata
      });
      setConfigs((current) => current.map((item) => (item.providerCode === saved.providerCode ? saved : item)));
      setMessage("Carrier config saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingProvider("");
    }
  };

  return (
    <div className="admin-api-config-layout">
      <div className="form-section-heading">
        <p className="eyebrow">{t("admin.logistics.api.eyebrow")}</p>
        <h1>{t("admin.logistics.api.title")}</h1>
        <p className="muted">{t("admin.logistics.api.description")}</p>
      </div>
      <div className="grid">
        {configs.map((config) => (
          <article className="card" key={config.providerCode}>
            <div className="detail-head">
              <div>
                <h3>{config.displayName}</h3>
                <p>{config.providerCode}</p>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={config.isActive} onChange={(event) => updateConfig(config.providerCode, "isActive", event.target.checked)} />
                <span>Active</span>
              </label>
            </div>
            <div className="form-grid">
              <TextField label="Display name" value={config.displayName} onChange={(value) => updateConfig(config.providerCode, "displayName", value)} />
              <TextField label="API base URL" value={config.apiBaseUrl} onChange={(value) => updateConfig(config.providerCode, "apiBaseUrl", value)} />
              <TextField label="Credential ref" value={config.credentialRef} onChange={(value) => updateConfig(config.providerCode, "credentialRef", value)} />
              <label className="field full">
                <span>Metadata JSON</span>
                <textarea rows={4} value={JSON.stringify(config.metadata, null, 2)} onChange={(event) => updateMetadata(config.providerCode, event.target.value)} />
              </label>
            </div>
            <div className="button-row">
              <button className="button primary" type="button" onClick={() => saveConfig(config)} disabled={savingProvider === config.providerCode}>
                {savingProvider === config.providerCode ? "Saving..." : "Save"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className={message.includes("failed") || message.includes("required") ? "status danger" : "status success"}>{message}</p> : null}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
