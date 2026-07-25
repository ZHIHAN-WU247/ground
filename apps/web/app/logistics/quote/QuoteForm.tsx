"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultLogisticsPricingRouteConfigs, defaultLogisticsRegionConfigs, type CargoType, type CurrencyCode, type LogisticsDeliveryMethod, type LogisticsPricingRouteConfig, type LogisticsQuote, type LogisticsRegionCountryConfig, type SupportedDestinationCountry } from "@ground/shared";
import { useI18n } from "../../../components/I18nProvider";
import { postJson } from "../../../lib/api";
import { listPricingRouteConfigs } from "../../../lib/logistics-pricing-api";
import { listLogisticsRegions } from "../../../lib/logistics-regions-api";
import { buildQuoteRoutePrices } from "./quote-routes";

interface QuoteFormState {
  cargoType: CargoType;
  destinationCountry: SupportedDestinationCountry;
  destinationCity: string;
  destinationPostalCode: string;
  destinationAddressLine: string;
  deliveryMethod: LogisticsDeliveryMethod;
  currency: CurrencyCode;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  packageCount: string;
}

const deliveryMethodOptions: LogisticsDeliveryMethod[] = ["TO_DOOR", "TO_WAREHOUSE"];

const initialState: QuoteFormState = {
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "",
  destinationPostalCode: "101000",
  destinationAddressLine: "Tverskaya Street 1",
  deliveryMethod: "TO_DOOR",
  currency: "CNY",
  weightKg: "1",
  lengthCm: "30",
  widthCm: "20",
  heightCm: "10",
  packageCount: "1"
};

export function QuoteForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(initialState);
  const [quote, setQuote] = useState<LogisticsQuote | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routeConfigs, setRouteConfigs] = useState<LogisticsPricingRouteConfig[]>(defaultLogisticsPricingRouteConfigs);
  const [regions, setRegions] = useState<LogisticsRegionCountryConfig[]>(defaultLogisticsRegionConfigs);
  const routePrices = quote ? buildQuoteRoutePrices(quote, routeConfigs) : [];
  const isCEndQuote = quote?.cargoType === "B2C";
  const countryOptions = getDestinationCountryOptions(regions);
  const cityOptions = regions.find((country) => country.name === form.destinationCountry)?.cities.filter((city) => city.isActive) ?? [];

  useEffect(() => {
    void listPricingRouteConfigs().then(setRouteConfigs);
    void listLogisticsRegions().then(setRegions);
  }, []);

  const updateField = <K extends keyof QuoteFormState>(field: K, value: QuoteFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitQuote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setQuote(null);

    try {
      const result = await postJson<LogisticsQuote, Record<string, string | number>>("/logistics/quotes", {
        cargoType: form.cargoType,
        destinationCountry: form.destinationCountry,
        destinationCity: form.destinationCity,
        destinationPostalCode: form.destinationPostalCode,
        destinationAddressLine: form.destinationAddressLine,
        deliveryMethod: form.deliveryMethod,
        currency: form.currency,
        weightKg: Number(form.weightKg),
        lengthCm: Number(form.lengthCm),
        widthCm: Number(form.widthCm),
        heightCm: Number(form.heightCm),
        packageCount: Number(form.packageCount)
      });
      setQuote(result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Quote request failed";
      setError(t("quote.error", { message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid two">
      <form className="panel" onSubmit={submitQuote}>
        <div className="form-section-heading">
          <p className="eyebrow">{t("quote.step")}</p>
          <h3>{t("quote.form.title")}</h3>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="cargoType">{t("common.cargoType")}</label>
            <select id="cargoType" value={form.cargoType} onChange={(event) => updateField("cargoType", event.target.value as CargoType)}>
              <option value="B2C">{t("cargo.B2C")}</option>
              <option value="B2B">{t("cargo.B2B")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="destinationCountry">{t("quote.label.destinationCountry")}</label>
            <select id="destinationCountry" value={form.destinationCountry} onChange={(event) => updateField("destinationCountry", event.target.value as SupportedDestinationCountry)}>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {t(`country.${country}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="destinationCity">{t("quote.label.destinationCity")}</label>
            <input id="destinationCity" list="quoteDestinationCities" value={form.destinationCity} onChange={(event) => updateField("destinationCity", event.target.value)} />
            <datalist id="quoteDestinationCities">
              {cityOptions.map((city) => <option key={city.id} value={city.name} />)}
            </datalist>
            <small className="field-hint">{t("quote.hint.destinationCity")}</small>
          </div>
          <div className="field">
            <label htmlFor="destinationPostalCode">{t("quote.label.destinationPostalCode")}</label>
            <input id="destinationPostalCode" value={form.destinationPostalCode} onChange={(event) => updateField("destinationPostalCode", event.target.value)} inputMode="numeric" required />
            <small className="field-hint">{t("quote.hint.destinationPostalCode")}</small>
          </div>
          <div className="field full">
            <label htmlFor="destinationAddressLine">{t("quote.label.destinationAddressLine")}</label>
            <input id="destinationAddressLine" value={form.destinationAddressLine} onChange={(event) => updateField("destinationAddressLine", event.target.value)} />
            <small className="field-hint">{t("quote.hint.destinationAddressLine")}</small>
          </div>
          <div className="field">
            <label htmlFor="deliveryMethod">{t("quote.label.deliveryMethod")}</label>
            <select id="deliveryMethod" value={form.deliveryMethod} onChange={(event) => updateField("deliveryMethod", event.target.value as LogisticsDeliveryMethod)}>
              {deliveryMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {t(`deliveryMethod.${method}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currency">{t("quote.label.currency")}</label>
            <select id="currency" value={form.currency} onChange={(event) => updateField("currency", event.target.value as CurrencyCode)}>
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="weight">{t("quote.label.weight")}</label>
            <input id="weight" type="number" min="0.1" step="0.1" value={form.weightKg} onChange={(event) => updateField("weightKg", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="packageCount">{t("quote.label.packageCount")}</label>
            <input id="packageCount" type="number" min="1" value={form.packageCount} onChange={(event) => updateField("packageCount", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="length">{t("quote.label.length")}</label>
            <input id="length" type="number" min="1" value={form.lengthCm} onChange={(event) => updateField("lengthCm", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="width">{t("quote.label.width")}</label>
            <input id="width" type="number" min="1" value={form.widthCm} onChange={(event) => updateField("widthCm", event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="height">{t("quote.label.height")}</label>
            <input id="height" type="number" min="1" value={form.heightCm} onChange={(event) => updateField("heightCm", event.target.value)} required />
          </div>
        </div>
        <p className="quote-resolution-note">{t("quote.resolution.note")}</p>
        <div className="button-row">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("quote.button.calculating") : t("quote.button.calculate")}
          </button>
        </div>
      </form>
      <div className="panel">
        <p className="eyebrow">{t("quote.result.eyebrow")}</p>
        {error ? <div className="empty-state">{error}</div> : null}
        {quote ? (
          <div className="result-block">
            {!isCEndQuote ? <h2>{quote.totalAmount ?? quote.amount} {quote.currency}</h2> : null}
            {routePrices.length > 0 ? (
              <div className="quote-route-list" aria-label={t("quote.route.listLabel")}>
                {routePrices.map((route) => (
                  <div className="quote-route-row" key={route.id}>
                    <span className="quote-route-copy">
                      <span className="quote-route-name">{t(route.labelKey)}</span>
                      <small className="quote-route-note">{t(route.noteKey)}</small>
                    </span>
                    <strong>
                      {route.amount} {route.currency}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
            {!isCEndQuote ? (
              <>
                <p>{t("quote.result.firstMile", { amount: quote.firstMileAmount ?? 0, currency: quote.currency })}</p>
                <p>{t("quote.result.lastMile", { amount: quote.lastMileAmount ?? quote.amount, currency: quote.currency })}</p>
                <p>{t("quote.result.total", { amount: quote.totalAmount ?? quote.amount, currency: quote.currency })}</p>
              </>
            ) : null}
            <p>{t("quote.result.deliveryMethod", { method: t(`deliveryMethod.${quote.deliveryMethod}`) })}</p>
            <p>{t("quote.result.chargeable", { value: quote.chargeableWeightKg })}</p>
            <p>{t("quote.result.actualVolumetric", { actual: quote.actualWeightKg, volumetric: quote.volumetricWeightKg })}</p>
            {!isCEndQuote && quote.exchangeRateNote ? <p className="soft">{quote.exchangeRateNote}</p> : null}
            <div className="button-row">
              <Link
                className="button primary"
                href={`/logistics/orders/new?deliveryMethod=${quote.deliveryMethod}&weightKg=${form.weightKg}&lengthCm=${form.lengthCm}&widthCm=${form.widthCm}&heightCm=${form.heightCm}`}
              >
                {t("quote.result.createOrder")}
              </Link>
            </div>
          </div>
        ) : !error ? (
          <div className="empty-state">{t("quote.empty")}</div>
        ) : null}
      </div>
    </div>
  );
}

function getDestinationCountryOptions(regions: LogisticsRegionCountryConfig[]): SupportedDestinationCountry[] {
  const values = regions
    .filter((country) => country.isActive && country.name !== "China")
    .map((country) => country.name)
    .filter((name): name is SupportedDestinationCountry => name === "Russia" || name === "Kazakhstan" || name === "Belarus");

  return values.length > 0 ? values : ["Russia"];
}
