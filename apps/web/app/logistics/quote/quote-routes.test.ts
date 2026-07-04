import assert from "node:assert/strict";

import type { LogisticsQuote } from "@ground/shared";
import { buildQuoteRoutePrices } from "./quote-routes";

const baseQuote: LogisticsQuote = {
  id: "quote-1",
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  deliveryMethod: "TO_DOOR",
  actualWeightKg: 1,
  volumetricWeightKg: 1.2,
  chargeableWeightKg: 1.2,
  amount: 575,
  firstMileAmount: 0,
  lastMileAmount: 575,
  totalAmount: 575,
  currency: "RUB",
  breakdown: []
};

const cEndRoutes = buildQuoteRoutePrices(baseQuote);

assert.deepEqual(
  cEndRoutes.map((route) => route.id),
  ["air-ems", "air-cdek", "land-cdek", "land-russia-post"]
);
assert.deepEqual(
  cEndRoutes.map((route) => route.labelKey),
  ["quote.route.airEms", "quote.route.airCdek", "quote.route.landCdek", "quote.route.landRussiaPost"]
);
assert.deepEqual(
  cEndRoutes.map((route) => route.noteKey),
  ["quote.route.airEms.note", "quote.route.airCdek.note", "quote.route.landCdek.note", "quote.route.landRussiaPost.note"]
);
assert.deepEqual(
  cEndRoutes.map((route) => `${route.amount} ${route.currency}`),
  ["295 CNY", "187.27 CNY", "104.77 CNY", "82.5 CNY"]
);

const lightQuote: LogisticsQuote = { ...baseQuote, chargeableWeightKg: 0.4 };
const lightRoutes = buildQuoteRoutePrices(lightQuote);
assert.deepEqual(
  lightRoutes.map((route) => `${route.amount} ${route.currency}`),
  ["185 CNY", "97.27 CNY", "69.77 CNY", "27.5 CNY"]
);

const fiveKgQuote: LogisticsQuote = {
  ...baseQuote,
  actualWeightKg: 5,
  chargeableWeightKg: 5,
  amount: 490,
  lastMileAmount: 490,
  totalAmount: 490
};
const fiveKgRoutes = buildQuoteRoutePrices(fiveKgQuote);
assert.deepEqual(
  fiveKgRoutes.map((route) => `${route.amount} ${route.currency}`),
  ["680 CNY", "494.55 CNY", "219.55 CNY", "275 CNY"]
);

assert.deepEqual(buildQuoteRoutePrices({ ...baseQuote, cargoType: "B2B" }), []);
