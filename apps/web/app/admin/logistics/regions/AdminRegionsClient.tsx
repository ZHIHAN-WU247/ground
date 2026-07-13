"use client";

import { useEffect, useState } from "react";
import type { LogisticsRegionCityConfig, LogisticsRegionCountryConfig } from "@ground/shared";
import { defaultLogisticsRegionConfigs } from "@ground/shared";
import { useI18n } from "../../../../components/I18nProvider";
import {
  listAdminLogisticsRegions,
  updateAdminLogisticsRegionCity,
  updateAdminLogisticsRegionCountry
} from "../../../../lib/logistics-regions-api";

export function AdminRegionsClient() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<LogisticsRegionCountryConfig[]>(defaultLogisticsRegionConfigs);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    void listAdminLogisticsRegions().then(setRegions);
  }, []);

  const updateCountry = <K extends keyof LogisticsRegionCountryConfig>(isoCode: string, field: K, value: LogisticsRegionCountryConfig[K]) => {
    setRegions((current) => current.map((country) => (country.isoCode === isoCode ? { ...country, [field]: value } : country)));
  };

  const updateCity = <K extends keyof LogisticsRegionCityConfig>(cityId: string, field: K, value: LogisticsRegionCityConfig[K]) => {
    setRegions((current) => current.map((country) => ({
      ...country,
      cities: country.cities.map((city) => (city.id === cityId ? { ...city, [field]: value } : city))
    })));
  };

  const saveCountry = async (country: LogisticsRegionCountryConfig) => {
    setSavingId(country.isoCode);
    setMessage("");

    try {
      const saved = await updateAdminLogisticsRegionCountry(country.isoCode, {
        name: country.name,
        isActive: country.isActive
      });
      setRegions((current) => current.map((item) => (item.isoCode === saved.isoCode ? saved : item)));
      setMessage("Country saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingId("");
    }
  };

  const saveCity = async (city: LogisticsRegionCityConfig) => {
    setSavingId(city.id);
    setMessage("");

    try {
      const saved = await updateAdminLogisticsRegionCity(city.id, city);
      setRegions((current) => current.map((country) => ({
        ...country,
        cities: country.cities.map((item) => (item.id === saved.id ? saved : item))
      })));
      setMessage("City saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="admin-regions-layout">
      <div className="form-section-heading">
        <p className="eyebrow">{t("admin.logistics.regions.eyebrow")}</p>
        <h1>{t("admin.logistics.regions.title")}</h1>
        <p className="muted">{t("admin.logistics.regions.description")}</p>
      </div>
      <div className="grid">
        {regions.map((country) => (
          <article className="card" key={country.isoCode}>
            <div className="detail-head">
              <div>
                <h3>{country.name}</h3>
                <p>{country.isoCode}</p>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={country.isActive} onChange={(event) => updateCountry(country.isoCode, "isActive", event.target.checked)} />
                <span>Active</span>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Country name</span>
                <input value={country.name} onChange={(event) => updateCountry(country.isoCode, "name", event.target.value)} />
              </label>
            </div>
            <div className="button-row compact">
              <button className="button primary" type="button" onClick={() => saveCountry(country)} disabled={savingId === country.isoCode}>
                {savingId === country.isoCode ? "Saving..." : "Save country"}
              </button>
            </div>
            <div className="grid">
              {country.cities.map((city) => (
                <div className="panel" key={city.id}>
                  <div className="detail-head">
                    <strong>{city.name}</strong>
                    <label className="checkbox-row">
                      <input type="checkbox" checked={city.isActive} onChange={(event) => updateCity(city.id, "isActive", event.target.checked)} />
                      <span>Active</span>
                    </label>
                  </div>
                  <div className="form-grid">
                    <TextField label="City" value={city.name} onChange={(value) => updateCity(city.id, "name", value)} />
                    <TextField label="Region" value={city.region} onChange={(value) => updateCity(city.id, "region", value)} />
                    <TextField label="Postal code" value={city.postalCodeHint} onChange={(value) => updateCity(city.id, "postalCodeHint", value)} />
                    <TextField label="CDEK city code" value={city.locationCode ?? ""} onChange={(value) => updateCity(city.id, "locationCode", value)} />
                    <TextField label="FIAS GUID" value={city.fiasGuid ?? ""} onChange={(value) => updateCity(city.id, "fiasGuid", value)} />
                  </div>
                  <div className="button-row compact">
                    <button className="button" type="button" onClick={() => saveCity(city)} disabled={savingId === city.id}>
                      {savingId === city.id ? "Saving..." : "Save city"}
                    </button>
                  </div>
                </div>
              ))}
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
