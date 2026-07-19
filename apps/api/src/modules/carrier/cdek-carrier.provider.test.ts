import assert from "node:assert/strict";

import type { LogisticsOrder } from "@ground/shared";
import { CdekCarrierProvider } from "./cdek-carrier.provider";

const provider = new CdekCarrierProvider();

const sampleOrder: LogisticsOrder = {
  id: "log-test",
  orderNo: "LG202699999999",
  cargoType: "B2C",
  deliveryMethod: "TO_DOOR",
  status: "UNDER_REVIEW",
  reviewState: "PENDING",
  sender: {
    name: "Sender",
    phone: "+79990000000",
    email: "sender@example.com",
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101000",
    addressLine: "Tverskaya Street 1",
    locationCode: "44",
    fiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
  } as LogisticsOrder["sender"],
  recipient: {
    name: "Recipient",
    phone: "+79990000001",
    email: "recipient@example.com",
    country: "Russia",
    province: "Saint Petersburg",
    city: "Saint Petersburg",
    postalCode: "190000",
    addressLine: "Nevsky Prospekt 1",
    locationCode: "137",
    fiasGuid: "bdeb2d2a-80ac-43e7-9d3c-2a75e2275d3f"
  } as LogisticsOrder["recipient"],
  goodsName: "Test cargo",
  declaredValue: 1,
  declaredCurrency: "CNY",
  taxIdOrDocumentNo: "TEST-1",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1,
  cdekTariffCode: 136 as unknown as never,
  createdAt: new Date().toISOString(),
  events: []
};

const { fiasGuid: _ignoredSenderFiasGuid, ...senderWithoutFias } = sampleOrder.sender;

const nonMoscowOriginOrder: LogisticsOrder = {
  ...sampleOrder,
  sender: {
    ...senderWithoutFias,
    country: "China",
    province: "Shanghai",
    city: "Shanghai",
    postalCode: "200000",
    addressLine: "Xuhui District 1",
    locationCode: "270"
  }
};

const payload = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder) => Record<string, unknown>;
}).buildOrderPayload(nonMoscowOriginOrder);

assert.equal((payload.from_location as Record<string, unknown>).region, "Moscow");
assert.equal((payload.from_location as Record<string, unknown>).country_code, "RU");
assert.equal((payload.from_location as Record<string, unknown>).city, "Moscow");
assert.equal((payload.from_location as Record<string, unknown>).code, 44);
assert.equal((payload.from_location as Record<string, unknown>).fias_guid, "c2deb16a-0330-4f05-821f-1d09c93331e6");
assert.equal((payload.to_location as Record<string, unknown>).region, "Saint Petersburg");
assert.equal((payload.to_location as Record<string, unknown>).code, 137);
assert.equal((payload.to_location as Record<string, unknown>).fias_guid, "bdeb2d2a-80ac-43e7-9d3c-2a75e2275d3f");
assert.equal(payload.tariff_code, 136);
const { cdekTariffCode: _ignoredTariffCode, ...sampleOrderWithoutTariff } = sampleOrder;
const payloadWithDefaultTariff = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder) => Record<string, unknown>;
}).buildOrderPayload(sampleOrderWithoutTariff);
assert.equal(payloadWithDefaultTariff.tariff_code, 137);
const landCdekOrderPayload = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder) => Record<string, unknown>;
}).buildOrderPayload({
  ...sampleOrderWithoutTariff,
  routeId: "land-cdek",
  deliveryMethod: "TO_WAREHOUSE"
});
assert.equal((landCdekOrderPayload.from_location as Record<string, unknown>).region, "Primorsky Krai");
assert.equal((landCdekOrderPayload.from_location as Record<string, unknown>).city, "Ussuriysk");
assert.equal((landCdekOrderPayload.from_location as Record<string, unknown>).postal_code, "692500");
assert.equal((landCdekOrderPayload.from_location as Record<string, unknown>).address, "Ussuriysk");
assert.equal((landCdekOrderPayload.from_location as Record<string, unknown>).code, 955);
assert.equal(landCdekOrderPayload.tariff_code, 234);
const landCdekDoorOrderPayload = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder) => Record<string, unknown>;
}).buildOrderPayload({
  ...sampleOrderWithoutTariff,
  routeId: "land-cdek",
  deliveryMethod: "TO_DOOR"
});
assert.equal(landCdekDoorOrderPayload.tariff_code, 233);
const warehouseOrderPayload = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder, options?: { shipmentPointCode?: string; deliveryPointCode?: string }) => Record<string, unknown>;
}).buildOrderPayload({
  ...sampleOrderWithoutTariff,
  deliveryMethod: "TO_WAREHOUSE"
}, { shipmentPointCode: "MSK42", deliveryPointCode: "SPB42" });
assert.equal(warehouseOrderPayload.tariff_code, 136);
assert.equal(warehouseOrderPayload.shipment_point, "MSK42");
assert.equal(warehouseOrderPayload.delivery_point, "SPB42");
assert.equal("from_location" in warehouseOrderPayload, false);
assert.equal("to_location" in warehouseOrderPayload, false);
const bEndOrderPayload = (provider as unknown as {
  buildOrderPayload: (order: LogisticsOrder) => Record<string, unknown>;
}).buildOrderPayload({
  ...sampleOrderWithoutTariff,
  cargoType: "B2B",
  deliveryMethod: "TO_WAREHOUSE"
});
assert.equal(bEndOrderPayload.tariff_code, 139);
const calculatorPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    routeId?: "air-cdek" | "land-cdek";
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod?: "TO_DOOR" | "TO_WAREHOUSE";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
    destinationLocationCode?: string;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Saint Petersburg",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 2,
  destinationLocationCode: "137"
});
assert.equal(calculatorPayload.tariff_code, 137);
assert.equal((calculatorPayload.from_location as Record<string, unknown>).code, 44);
assert.equal((calculatorPayload.to_location as Record<string, unknown>).code, 137);
assert.equal((calculatorPayload.packages as unknown[]).length, 2);

const landCdekCalculatorPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    routeId: "land-cdek";
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod: "TO_WAREHOUSE";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
    destinationLocationCode?: string;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  routeId: "land-cdek",
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Saint Petersburg",
  deliveryMethod: "TO_WAREHOUSE",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1,
  destinationLocationCode: "137"
});
assert.equal((landCdekCalculatorPayload.from_location as Record<string, unknown>).region, "Primorsky Krai");
assert.equal((landCdekCalculatorPayload.from_location as Record<string, unknown>).city, "Ussuriysk");
assert.equal((landCdekCalculatorPayload.from_location as Record<string, unknown>).postal_code, "692500");
assert.equal((landCdekCalculatorPayload.from_location as Record<string, unknown>).address, "Ussuriysk");
assert.equal((landCdekCalculatorPayload.from_location as Record<string, unknown>).code, 955);
assert.equal("fias_guid" in (landCdekCalculatorPayload.from_location as Record<string, unknown>), false);
assert.equal(landCdekCalculatorPayload.tariff_code, 234);

const landCdekDoorCalculatorPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    routeId: "land-cdek";
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod: "TO_DOOR";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
    destinationLocationCode?: string;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  routeId: "land-cdek",
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Saint Petersburg",
  deliveryMethod: "TO_DOOR",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1,
  destinationLocationCode: "137"
});
assert.equal(landCdekDoorCalculatorPayload.tariff_code, 233);

const cEndWarehouseToDoorPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod: "TO_DOOR";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  deliveryMethod: "TO_DOOR",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1
});
assert.equal(cEndWarehouseToDoorPayload.tariff_code, 137);

const cEndWarehouseToWarehousePayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod: "TO_WAREHOUSE";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  deliveryMethod: "TO_WAREHOUSE",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1
});
assert.equal(cEndWarehouseToWarehousePayload.tariff_code, 136);

const bEndPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    cargoType: "B2B";
    destinationCountry: "Russia";
    destinationCity: string;
    deliveryMethod: "TO_WAREHOUSE";
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  cargoType: "B2B",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  deliveryMethod: "TO_WAREHOUSE",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1
});
assert.equal(bEndPayload.tariff_code, 139);

const moscowCalculatorPayload = (provider as unknown as {
  buildCalculatorPayload: (input: {
    cargoType: "B2C";
    destinationCountry: "Russia";
    destinationCity: string;
    currency: "CNY";
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  }) => Record<string, unknown>;
}).buildCalculatorPayload({
  cargoType: "B2C",
  destinationCountry: "Russia",
  destinationCity: "Moscow",
  currency: "CNY",
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  packageCount: 1
});
assert.equal((moscowCalculatorPayload.to_location as Record<string, unknown>).code, 44);
assert.equal((moscowCalculatorPayload.to_location as Record<string, unknown>).postal_code, "101000");

const run = async () => {
  const numericTrackingProvider = new CdekCarrierProvider() as unknown as {
    createOrder: (order: LogisticsOrder) => Promise<{ entityUuid: string; requestUuid: string | undefined; cdekNumber: string | undefined; state: string | undefined; raw: unknown }>;
    cdekFetch: (path: string, options: { method: "GET" | "POST"; body?: unknown }) => Promise<Record<string, unknown> | Array<Record<string, unknown>>>;
    assertProductionWritesEnabled: () => void;
  };

  numericTrackingProvider.assertProductionWritesEnabled = () => undefined;
  const numericTrackingCalls: Array<{ path: string; options: { method: "GET" | "POST"; body?: unknown } }> = [];
  numericTrackingProvider.cdekFetch = async (path, options) => {
    numericTrackingCalls.push({ path, options });

    if (path.startsWith("/v2/deliverypoints")) {
      return [{ code: "SPB42", location: { postal_code: "190000" } }];
    }

    return {
      entity: {
        uuid: "test-entity-1",
        cdek_number: 1106626962
      },
      requests: [{ uuid: "test-request-1", state: "SUCCESSFUL" }]
    };
  };

  const createOrderResult = await numericTrackingProvider.createOrder(sampleOrder);
  assert.equal(createOrderResult.cdekNumber, "1106626962");
  const createOrderCall = numericTrackingCalls.find((call) => call.path === "/v2/orders");
  const createOrderPayload = createOrderCall?.options.body as Record<string, unknown>;
  assert.equal(createOrderPayload.shipment_point, "SPB42");
  assert.equal(createOrderPayload.delivery_point, "SPB42");

  numericTrackingCalls.length = 0;
  await numericTrackingProvider.createOrder({
    ...sampleOrderWithoutTariff,
    routeId: "land-cdek",
    deliveryMethod: "TO_WAREHOUSE"
  });
  const landCdekCreateOrderCall = numericTrackingCalls.find((call) => call.path === "/v2/orders");
  const landCdekCreateOrderPayload = landCdekCreateOrderCall?.options.body as Record<string, unknown>;
  assert.equal(landCdekCreateOrderPayload.tariff_code, 234);
  assert.equal(landCdekCreateOrderPayload.shipment_point, "SPB42");
  assert.equal(landCdekCreateOrderPayload.delivery_point, "SPB42");

  const quoteProvider = new CdekCarrierProvider() as unknown as {
    calculateQuote: (input: {
      cargoType: "B2C";
      destinationCountry: "Russia";
      destinationCity: string;
      deliveryMethod?: "TO_DOOR" | "TO_WAREHOUSE";
      currency: "CNY";
      weightKg: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      packageCount: number;
    }) => Promise<{ firstMileAmount: number; lastMileAmount: number; totalAmount: number; amount: number; currency: string; chargeableWeightKg: number; cdekTariffCode?: number }>;
    cdekFetch: (path: string, options: { method: "GET" | "POST"; body?: unknown }) => Promise<Record<string, unknown> | Array<Record<string, unknown>>>;
  };

  quoteProvider.cdekFetch = async (path) => {
    if (path.startsWith("/v2/location/cities")) {
      return [{ code: 44, city: "Moscow" }];
    }

    return {
      total_sum: 444.5,
      delivery_sum: 444.5,
      currency: "RUB",
      weight_calc: 1000,
      period_min: 1,
      period_max: 2
    };
  };

  const quote = await quoteProvider.calculateQuote({
    cargoType: "B2C",
    destinationCountry: "Russia",
    destinationCity: "Moscow",
    deliveryMethod: "TO_WAREHOUSE",
    currency: "CNY",
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    packageCount: 1
  });
  assert.equal(quote.firstMileAmount, 0);
  assert.equal(quote.lastMileAmount, 444.5);
  assert.equal(quote.totalAmount, 444.5);
  assert.equal(quote.amount, 444.5);
  assert.equal(quote.currency, "RUB");
  assert.equal(quote.chargeableWeightKg, 1);
  assert.equal(quote.cdekTariffCode, 136);

  const resolvingQuoteProvider = new CdekCarrierProvider() as unknown as {
    calculateQuote: (input: {
      cargoType: "B2C";
      destinationCountry: "Russia";
      destinationCity: string;
      destinationPostalCode?: string;
      deliveryMethod?: "TO_DOOR" | "TO_WAREHOUSE";
      currency: "CNY";
      weightKg: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      packageCount: number;
    }) => Promise<{ cdekTariffCode?: number }>;
    cdekFetch: (path: string, options: { method: "GET" | "POST"; body?: unknown }) => Promise<Record<string, unknown> | Array<Record<string, unknown>>>;
  };
  const resolvingCalls: Array<{ path: string; options: { method: "GET" | "POST"; body?: unknown } }> = [];
  resolvingQuoteProvider.cdekFetch = async (path, options) => {
    resolvingCalls.push({ path, options });

    if (path.startsWith("/v2/location/cities")) {
      return [
        {
          code: 137,
          city: "Saint Petersburg",
          postal_code: "190000",
          fias_guid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
        }
      ];
    }

    return {
      total_sum: 620,
      delivery_sum: 620,
      currency: "RUB",
      weight_calc: 1000
    };
  };
  await resolvingQuoteProvider.calculateQuote({
    cargoType: "B2C",
    destinationCountry: "Russia",
    destinationCity: "Saint Petersburg",
    destinationPostalCode: "190000",
    deliveryMethod: "TO_DOOR",
    currency: "CNY",
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    packageCount: 1
  });
  const [cityLookupPath = "", cityLookupQuery = ""] = resolvingCalls[0]?.path.split("?") ?? [];
  const cityLookupParams = new URLSearchParams(cityLookupQuery);
  assert.equal(cityLookupPath, "/v2/location/cities");
  assert.equal(cityLookupParams.get("country_codes"), "RU");
  assert.equal(cityLookupParams.get("postal_code"), "190000");
  assert.equal(cityLookupParams.get("lang"), "eng");
  assert.equal(cityLookupParams.get("size"), "5");
  assert.equal((resolvingCalls[1]?.options.body as { to_location: Record<string, unknown> }).to_location.code, 137);
  assert.equal((resolvingCalls[1]?.options.body as { to_location: Record<string, unknown> }).to_location.postal_code, "190000");

  const ambiguousQuoteProvider = new CdekCarrierProvider() as unknown as {
    calculateQuote: (input: {
      cargoType: "B2C";
      destinationCountry: "Russia";
      destinationCity: string;
      deliveryMethod?: "TO_DOOR" | "TO_WAREHOUSE";
      currency: "CNY";
      weightKg: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      packageCount: number;
    }) => Promise<unknown>;
    cdekFetch: (path: string, options: { method: "GET" | "POST"; body?: unknown }) => Promise<Array<Record<string, unknown>>>;
  };
  ambiguousQuoteProvider.cdekFetch = async () => [
    { code: 424, city: "Kazan", region_code: 39, region: "Tatarstan" },
    { code: 1853482, city: "Kazan", region_code: 44, region: "Other region" }
  ];
  await assert.rejects(
    () =>
      ambiguousQuoteProvider.calculateQuote({
        cargoType: "B2C",
        destinationCountry: "Russia",
        destinationCity: "Kazan",
        deliveryMethod: "TO_DOOR",
        currency: "CNY",
        weightKg: 1,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        packageCount: 1
      }),
    {
      message: "Multiple CDEK cities matched Kazan. Add a postal code or choose a city from suggestions before requesting a quote."
    }
  );
};

void run();
