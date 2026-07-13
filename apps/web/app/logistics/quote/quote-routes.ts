import { defaultLogisticsPricingRouteConfigs, type CurrencyCode, type LogisticsPricingRouteConfig, type LogisticsQuote, type LogisticsRouteId } from "@ground/shared";

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
  ...defaultLogisticsPricingRouteConfigs.map((config) => ({
    id: config.routeId,
    labelKey: config.labelKey,
    noteKey: config.noteKey
  }))
];

export function buildQuoteRoutePrices(
  quote: Pick<LogisticsQuote, "cargoType" | "currency" | "totalAmount" | "amount" | "chargeableWeightKg">,
  configs: LogisticsPricingRouteConfig[] = defaultLogisticsPricingRouteConfigs
): QuoteRoutePrice[] {
  if (quote.cargoType !== "B2C") {
    return [];
  }

  const cdekLastMileAmount = quote.totalAmount ?? quote.amount;
  const activeConfigs = configs
    .filter((config) => config.cargoType === "B2C" && config.isActive)
    .sort((current, next) => current.sortOrder - next.sortOrder);

  const routeCurrency: CurrencyCode = "CNY";

  return activeConfigs.map((config) => ({
    id: config.routeId,
    labelKey: config.labelKey,
    noteKey: config.noteKey,
    amount: calculateRouteAmount(config, quote.chargeableWeightKg, cdekLastMileAmount, quote.currency),
    currency: routeCurrency
  }));
}

export function selectQuoteRoutePrice(
  quote: Pick<LogisticsQuote, "cargoType" | "currency" | "totalAmount" | "amount" | "chargeableWeightKg">,
  routeId: LogisticsRouteId,
  configs: LogisticsPricingRouteConfig[] = defaultLogisticsPricingRouteConfigs
) {
  return buildQuoteRoutePrices(quote, configs).find((route) => route.id === routeId);
}

function calculateRouteAmount(config: LogisticsPricingRouteConfig, weightKg: number, lastMileAmount: number, lastMileCurrency: CurrencyCode) {
  if (config.formula === "half_kg_step") {
    return calculateHalfKgStepAmount(weightKg, config);
  }

  if (config.formula === "cdek_first_last_mile") {
    const cdekLastMileCny = convertToCny(lastMileAmount, lastMileCurrency, config.rubPerCny ?? 11);
    return calculateCdekRouteAmount(weightKg, config.firstMileCnyPerKg ?? 0, config.halfKgUnit, cdekLastMileCny);
  }

  return calculatePerKgAmount(weightKg, config);
}

function convertToCny(amount: number, currency: CurrencyCode, rubPerCny: number) {
  if (currency === "RUB") {
    return amount / rubPerCny;
  }

  return amount;
}

function calculateCdekRouteAmount(weightKg: number, firstMileCnyPerKg: number, halfKgUnit: number, lastMileCny: number) {
  const firstMileBillableWeightKg = getBillableHalfKgUnits(weightKg, halfKgUnit) * halfKgUnit;

  return roundMoney(firstMileBillableWeightKg * firstMileCnyPerKg + lastMileCny);
}

function getBillableHalfKgUnits(weightKg: number, halfKgUnit: number) {
  return Math.max(1, Math.ceil(weightKg / halfKgUnit));
}

function calculateHalfKgStepAmount(weightKg: number, config: LogisticsPricingRouteConfig) {
  const units = getBillableHalfKgUnits(weightKg, config.halfKgUnit);

  return roundMoney((config.baseAmount ?? 0) + (units - 1) * (config.stepAmount ?? 0));
}

function calculatePerKgAmount(weightKg: number, config: LogisticsPricingRouteConfig) {
  const billableWeightKg = getBillableHalfKgUnits(weightKg, config.halfKgUnit) * config.halfKgUnit;

  return roundMoney(billableWeightKg * (config.perKgAmount ?? 0));
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}
