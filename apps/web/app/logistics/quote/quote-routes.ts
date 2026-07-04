import type { CurrencyCode, LogisticsQuote, LogisticsRouteId } from "@ground/shared";

export type QuoteRoutePriceId = LogisticsRouteId;

export interface QuoteRouteOption {
  id: LogisticsRouteId;
  labelKey: string;
  noteKey: string;
}

export interface QuoteRoutePrice {
  id: LogisticsRouteId;
  labelKey: string;
  noteKey: string;
  amount: number;
  currency: CurrencyCode;
}

export const quoteRouteOptions: QuoteRouteOption[] = [
  {
    id: "air-ems",
    labelKey: "quote.route.airEms",
    noteKey: "quote.route.airEms.note"
  },
  {
    id: "air-cdek",
    labelKey: "quote.route.airCdek",
    noteKey: "quote.route.airCdek.note"
  },
  {
    id: "land-cdek",
    labelKey: "quote.route.landCdek",
    noteKey: "quote.route.landCdek.note"
  },
  {
    id: "land-russia-post",
    labelKey: "quote.route.landRussiaPost",
    noteKey: "quote.route.landRussiaPost.note"
  }
];

const halfKgUnit = 0.5;
const rubPerCny = 11;
const airCdekFirstMileCnyPerKg = 90;
const landCdekFirstMileCnyPerKg = 35;

export function buildQuoteRoutePrices(quote: Pick<LogisticsQuote, "cargoType" | "currency" | "totalAmount" | "amount" | "chargeableWeightKg">): QuoteRoutePrice[] {
  if (quote.cargoType !== "B2C") {
    return [];
  }

  const cdekLastMileAmount = quote.totalAmount ?? quote.amount;
  const cdekLastMileCny = convertToCny(cdekLastMileAmount, quote.currency);

  const routeAmounts: Record<LogisticsRouteId, { amount: number; currency: CurrencyCode }> = {
    "air-ems": {
      amount: calculateAirEmsAmount(quote.chargeableWeightKg),
      currency: "CNY"
    },
    "air-cdek": {
      amount: calculateCdekRouteAmount(quote.chargeableWeightKg, airCdekFirstMileCnyPerKg, cdekLastMileCny),
      currency: "CNY"
    },
    "land-cdek": {
      amount: calculateCdekRouteAmount(quote.chargeableWeightKg, landCdekFirstMileCnyPerKg, cdekLastMileCny),
      currency: "CNY"
    },
    "land-russia-post": {
      amount: calculateLandRussiaPostAmount(quote.chargeableWeightKg),
      currency: "CNY"
    }
  };

  return quoteRouteOptions.map((route) => ({
    ...route,
    ...routeAmounts[route.id]
  }));
}

function convertToCny(amount: number, currency: CurrencyCode) {
  if (currency === "RUB") {
    return amount / rubPerCny;
  }

  return amount;
}

function calculateCdekRouteAmount(weightKg: number, firstMileCnyPerKg: number, lastMileCny: number) {
  const firstMileBillableWeightKg = getBillableHalfKgUnits(weightKg) * halfKgUnit;

  return roundMoney(firstMileBillableWeightKg * firstMileCnyPerKg + lastMileCny);
}

function getBillableHalfKgUnits(weightKg: number) {
  return Math.max(1, Math.ceil(weightKg / halfKgUnit));
}

function calculateAirEmsAmount(weightKg: number) {
  const units = getBillableHalfKgUnits(weightKg);

  return 185 + (units - 1) * 55;
}

function calculateLandRussiaPostAmount(weightKg: number) {
  const billableWeightKg = getBillableHalfKgUnits(weightKg) * halfKgUnit;

  return roundMoney(billableWeightKg * 55);
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}
