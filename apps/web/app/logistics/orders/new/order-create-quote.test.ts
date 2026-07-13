const assert: typeof import("node:assert/strict") = require("node:assert/strict");
const { buildQuoteRoutePrices, selectQuoteRoutePrice } = require("../../quote/quote-routes") as typeof import("../../quote/quote-routes");
const { buildOrderCreateQuotePayload, getOrderCreateQuotePayloadKey } = require("./order-create-quote") as typeof import("./order-create-quote");
type LogisticsQuote = import("@ground/shared").LogisticsQuote;

const payload = buildOrderCreateQuotePayload({
  cargoType: "B2C",
  recipientCountry: "Russia",
  recipientCity: "Moscow",
  recipientPostalCode: "101000",
  recipientAddressLine: "Tverskaya Street 8",
  deliveryMethod: "TO_WAREHOUSE",
  weightKg: "6.5",
  lengthCm: "42",
  widthCm: "36",
  heightCm: "28"
});

assert.deepEqual(payload, {
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  destinationPostalCode: "101000",
  destinationAddressLine: "Tverskaya Street 8",
  deliveryMethod: "TO_WAREHOUSE",
  currency: "CNY",
  weightKg: 6.5,
  lengthCm: 42,
  widthCm: 36,
  heightCm: 28,
  packageCount: 1
});

assert.equal(
  buildOrderCreateQuotePayload({
    cargoType: "B2C",
    recipientCountry: "Russia",
    recipientCity: "",
    recipientPostalCode: "101000",
    recipientAddressLine: "Tverskaya Street 8",
    deliveryMethod: "TO_DOOR",
    weightKg: "6.5",
    lengthCm: "42",
    widthCm: "36",
    heightCm: "28"
  }),
  null
);

const changedPayload = buildOrderCreateQuotePayload({
  cargoType: "B2C",
  recipientCountry: "Russia",
  recipientCity: "Moscow",
  recipientPostalCode: "101000",
  recipientAddressLine: "Tverskaya Street 8",
  deliveryMethod: "TO_WAREHOUSE",
  weightKg: "7",
  lengthCm: "42",
  widthCm: "36",
  heightCm: "28"
});

assert.notEqual(getOrderCreateQuotePayloadKey(payload!, "air-cdek"), getOrderCreateQuotePayloadKey(changedPayload!, "air-cdek"));
assert.notEqual(getOrderCreateQuotePayloadKey(payload!, "air-cdek"), getOrderCreateQuotePayloadKey(payload!, "land-cdek"));

const quote: LogisticsQuote = {
  id: "quote-1",
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  deliveryMethod: "TO_WAREHOUSE",
  actualWeightKg: 6.5,
  volumetricWeightKg: 7.06,
  chargeableWeightKg: 7.06,
  amount: 320,
  firstMileAmount: 0,
  lastMileAmount: 320,
  totalAmount: 320,
  currency: "RUB",
  breakdown: []
};
const routePrices = buildQuoteRoutePrices(quote);
const airCdekRoutePrice = routePrices.find((route) => route.id === "air-cdek");

assert.deepEqual(selectQuoteRoutePrice(quote, "air-cdek"), airCdekRoutePrice);

export {};
