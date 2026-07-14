import assert from "node:assert/strict";

import type { LogisticsPricingRouteConfig } from "@ground/shared";
import { toAdminPricingRouteConfigPatch } from "./logistics-pricing-api";

const config: LogisticsPricingRouteConfig = {
  routeId: "air-cdek",
  deliveryMethod: "TO_DOOR",
  cargoType: "B2C",
  labelKey: "quote.route.airCdek",
  noteKey: "quote.route.airCdek.note",
  currency: "USD",
  isActive: true,
  formula: "cdek_first_last_mile",
  sortOrder: 1,
  halfKgUnit: 0.5,
  baseAmount: 0,
  stepAmount: 0,
  firstMileCnyPerKg: 100,
  perKgAmount: 0,
  rubPerCny: 11
};

assert.deepEqual(toAdminPricingRouteConfigPatch(config), {
  deliveryMethod: "TO_DOOR",
  labelKey: "quote.route.airCdek",
  noteKey: "quote.route.airCdek.note",
  currency: "USD",
  isActive: true,
  formula: "cdek_first_last_mile",
  sortOrder: 1,
  halfKgUnit: 0.5,
  baseAmount: 0,
  stepAmount: 0,
  firstMileCnyPerKg: 100,
  perKgAmount: 0,
  rubPerCny: 11
});
