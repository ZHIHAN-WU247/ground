import assert from "node:assert/strict";

import type { LogisticsOrder } from "@ground/shared";
import { buildQuoteRoutePrices } from "../../logistics/quote/quote-routes";
import { formatAccountLogisticsQuote } from "./account-order-quotes";

const fallback = "待报价";

const orderWithAirCdekQuote: LogisticsOrder = {
  id: "logistics-1",
  orderNo: "AC20260709215007430126",
  cargoType: "B2C",
  routeId: "air-cdek",
  deliveryMethod: "TO_DOOR",
  status: "UNDER_REVIEW",
  reviewState: "PENDING",
  sender: {
    name: "Sender",
    phone: "+86 0000",
    country: "China",
    province: "Shanghai",
    city: "Shanghai",
    postalCode: "200000",
    addressLine: "Warehouse"
  },
  recipient: {
    name: "Ivan",
    phone: "+7 0000",
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101000",
    addressLine: "Tverskaya Street 1"
  },
  goodsName: "shoe",
  declaredValue: 100,
  declaredCurrency: "CNY",
  taxIdOrDocumentNo: "doc-1",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1,
  estimatedQuote: {
    deliveryMethod: "TO_DOOR",
    actualWeightKg: 1,
    volumetricWeightKg: 1,
    chargeableWeightKg: 1.2,
    amount: 385,
    firstMileAmount: 0,
    lastMileAmount: 385,
    totalAmount: 385,
    currency: "RUB"
  },
  events: [],
  createdAt: "2026-07-09T13:50:08.000Z"
};

const accountQuote = formatAccountLogisticsQuote(orderWithAirCdekQuote, fallback);
const quotePageRoutePrice = buildQuoteRoutePrices({
  ...orderWithAirCdekQuote.estimatedQuote!,
  cargoType: orderWithAirCdekQuote.cargoType
}).find((route) => route.id === orderWithAirCdekQuote.routeId);

assert.equal(accountQuote, `${quotePageRoutePrice!.amount.toFixed(2)} ${quotePageRoutePrice!.currency}`);

const { estimatedQuote: _estimatedQuote, ...orderWithoutQuote } = orderWithAirCdekQuote;
assert.equal(formatAccountLogisticsQuote(orderWithoutQuote, fallback), fallback);
