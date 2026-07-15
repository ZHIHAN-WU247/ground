import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FixedCarrierProvider } from "../carrier/fixed-carrier.provider";
import { CdekCarrierProvider } from "../carrier/cdek-carrier.provider";
import { LogisticsService } from "./logistics.service";
import { defaultLogisticsPricingRouteConfigs, type LogisticsPricingRouteConfig } from "@ground/shared";

class StubCdekCarrierProvider extends CdekCarrierProvider {
  override async calculateQuote(input: Parameters<CdekCarrierProvider["calculateQuote"]>[0]) {
    const chargeableWeightKg = input.weightKg < 1 ? input.weightKg : 14.11;

    return {
      id: "quote-cdek-1",
      cargoType: "B2C" as const,
      destinationCountry: "Russia" as const,
      destinationCity: "Moscow",
      deliveryMethod: input.deliveryMethod ?? "TO_DOOR" as const,
      actualWeightKg: 6.5,
      volumetricWeightKg: 7.06,
      chargeableWeightKg,
      amount: 320,
      firstMileAmount: 0,
      lastMileAmount: 320,
      totalAmount: 320,
      currency: "RUB" as const,
      cdekTariffCode: 139,
      cdekDeliveryMinDays: 1,
      cdekDeliveryMaxDays: 2,
      breakdown: [
        { label: "First mile amount", amount: 0 },
        { label: "CDEK last-mile amount", amount: 320 },
        { label: "Total amount", amount: 320 }
      ]
    };
  }

  override async createOrder() {
    return {
      entityUuid: "cdek-entity-1",
      requestUuid: "cdek-request-1",
      cdekNumber: undefined,
      state: "INVALID",
      raw: {
        errors: [{ message: "По данному направлению при заданных условиях выбранный тариф недоступен" }]
      }
    };
  }
}

function createPricingService(routeConfigs: LogisticsPricingRouteConfig[]) {
  const rows = routeConfigs.map((config, index) => ({
    id: `table-${config.routeId}`,
    cargo_type: config.cargoType,
    route_id: config.routeId,
    delivery_method: config.deliveryMethod,
    name: config.labelKey,
    currency: config.currency,
    is_active: config.isActive,
    template_version: "route-config-v1",
    metadata: {
      label_key: config.labelKey,
      note_key: config.noteKey,
      sort_order: config.sortOrder
    },
    created_at: `2026-07-14T00:00:0${index}.000Z`,
    updated_at: `2026-07-14T00:00:0${index}.000Z`,
    pricing_rules: [
      {
        id: `rule-${config.routeId}`,
        pricing_table_id: `table-${config.routeId}`,
        destination_country: "Russia",
        destination_city: "*",
        min_weight_kg: 0,
        max_weight_kg: null,
        base_price: config.baseAmount ?? 0,
        per_kg_price: config.perKgAmount ?? 0,
        first_mile_price: config.firstMileCnyPerKg ?? 0,
        last_mile_price: 0,
        volumetric_divisor: 6000,
        metadata: {
          formula: config.formula,
          half_kg_unit: config.halfKgUnit,
          step_price: config.stepAmount ?? 0,
          rub_per_cny: config.rubPerCny ?? 11
        },
        created_at: `2026-07-14T00:00:0${index}.000Z`
      }
    ]
  }));

  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null })
  };

  return {
    client: {
      from: () => query
    }
  };
}

const run = async () => {
  const isolatedDirectory = mkdtempSync(join(tmpdir(), "ground-logistics-isolated-"));
  const service = new LogisticsService(
    new FixedCarrierProvider(),
    new StubCdekCarrierProvider(),
    join(isolatedDirectory, "logistics-orders.json")
  );
  const customPricingService = new LogisticsService(
    new FixedCarrierProvider(),
    new StubCdekCarrierProvider(),
    join(isolatedDirectory, "custom-pricing-orders.json"),
    createPricingService(defaultLogisticsPricingRouteConfigs.map((config) => {
      if (config.routeId === "air-cdek") {
        return { ...config, firstMileCnyPerKg: 120, rubPerCny: 10 };
      }

      if (config.routeId === "land-cdek") {
        return { ...config, firstMileCnyPerKg: 40, rubPerCny: 10 };
      }

      return config;
    })) as never
  );

  const approved = await service.reviewOrder("log-1002", {
    decision: "APPROVE",
    correctedWeightKg: 6.5,
    correctedLengthCm: 42,
    correctedWidthCm: 36,
    correctedHeightCm: 28,
    cdekTariffCode: 136
  });

  assert.equal(approved.reviewState, "APPROVED");
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.reviewFailureReason, undefined);
  assert.equal(approved.trackingNo, undefined);
  assert.equal(approved.cdekTariffCode, 136);
  assert.equal(approved.carrierLastError, "Selected CDEK tariff is unavailable for the current route and shipment conditions.");

  await assert.rejects(() => service.markInbound("log-1002"), {
    message: "Only reviewed orders with a tracking number can be marked inbound."
  });

  const quote = await service.createQuote({
    cargoType: "B2C" as const,
    destinationCountry: "Russia",
    destinationCity: "Moscow",
    deliveryMethod: "TO_DOOR",
    currency: "USD",
    weightKg: 6.5,
    lengthCm: 42,
    widthCm: 36,
    heightCm: 28,
    packageCount: 2
  });

  assert.equal(quote.firstMileAmount, 0);
  assert.equal(quote.lastMileAmount, 320);
  assert.equal(quote.totalAmount, 320);
  assert.equal(quote.amount, 320);
  assert.equal(quote.currency, "RUB");

  const pricedQuote = await customPricingService.createQuote({
    cargoType: "B2C" as const,
    destinationCountry: "Russia",
    destinationCity: "Moscow",
    deliveryMethod: "TO_DOOR",
    currency: "CNY",
    weightKg: 6.5,
    lengthCm: 42,
    widthCm: 36,
    heightCm: 28,
    packageCount: 2
  });

  assert.deepEqual(
    pricedQuote.routePrices?.filter((route) => ["air-ems", "air-cdek", "land-cdek", "land-russia-post"].includes(route.routeId)).map((route) => ({
      routeId: route.routeId,
      firstMileAmount: route.firstMileAmount,
      lastMileAmount: route.lastMileAmount,
      totalAmount: route.totalAmount,
      currency: route.currency
    })),
    [
      { routeId: "air-ems", firstMileAmount: 1725, lastMileAmount: 0, totalAmount: 1725, currency: "CNY" },
      { routeId: "air-cdek", firstMileAmount: 1740, lastMileAmount: 32, totalAmount: 1772, currency: "CNY" },
      { routeId: "land-cdek", firstMileAmount: 580, lastMileAmount: 32, totalAmount: 612, currency: "CNY" },
      { routeId: "land-russia-post", firstMileAmount: 797.5, lastMileAmount: 0, totalAmount: 797.5, currency: "CNY" }
    ]
  );

  const lightPricedQuote = await customPricingService.createQuote({
    cargoType: "B2C" as const,
    destinationCountry: "Russia",
    destinationCity: "Moscow",
    deliveryMethod: "TO_DOOR",
    currency: "CNY",
    weightKg: 0.4,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    packageCount: 1
  });

  assert.deepEqual(
    lightPricedQuote.routePrices?.filter((route) => ["air-cdek", "land-cdek", "land-russia-post"].includes(route.routeId)).map((route) => ({
      routeId: route.routeId,
      firstMileAmount: route.firstMileAmount,
      lastMileAmount: route.lastMileAmount,
      totalAmount: route.totalAmount,
      currency: route.currency
    })),
    [
      { routeId: "air-cdek", firstMileAmount: 120, lastMileAmount: 32, totalAmount: 152, currency: "CNY" },
      { routeId: "land-cdek", firstMileAmount: 40, lastMileAmount: 32, totalAmount: 72, currency: "CNY" },
      { routeId: "land-russia-post", firstMileAmount: 55, lastMileAmount: 0, totalAmount: 55, currency: "CNY" }
    ]
  );

  const createOrderInput = {
    ownerEmail: "Customer@Example.com",
    cargoType: "B2C" as const,
    sender: {
      name: "Ground Customer",
      phone: "+86 755 3000 2200",
      email: "customer@ground.test",
      country: "China",
      province: "Guangdong",
      city: "Shenzhen",
      postalCode: "518000",
      addressLine: "Nanshan logistics building"
    },
    recipient: {
      name: "Ivan Petrov",
      phone: "+7 900 000 2200",
      email: "ivan@example.com",
      country: "Russia",
      province: "Moscow",
      city: "Moscow",
      postalCode: "101000",
      addressLine: "Tverskaya Street 8"
    },
    cargoItems: [
      { name: "Cotton hoodie", unitValueCny: 80, quantity: 2 },
      { name: "Wool socks", unitValueCny: 12.5, quantity: 3 }
    ],
    routeId: "air-cdek" as const,
    deliveryMethod: "TO_WAREHOUSE" as const,
    goodsName: "Garment samples",
    declaredValue: 120,
    declaredCurrency: "USD" as const,
    taxIdOrDocumentNo: "RU-DOC-2200",
    weightKg: 6.5,
    lengthCm: 42,
    widthCm: 36,
    heightCm: 28,
    packageCount: 2
  };

  const created = await service.createOrder(createOrderInput);
  const createdWithCargoItems = created as typeof created & {
    cargoItems?: Array<{ name: string; unitValueCny: number; quantity: number }>;
  };

  assert.deepEqual(createdWithCargoItems.cargoItems, [
    { name: "Cotton hoodie", unitValueCny: 80, quantity: 2 },
    { name: "Wool socks", unitValueCny: 12.5, quantity: 3 }
  ]);
  assert.equal(created.goodsName, "Cotton hoodie, Wool socks");
  assert.equal(created.declaredValue, 197.5);
  assert.equal(created.declaredCurrency, "CNY");
  assert.equal(created.routeId, "air-cdek");
  assert.match(created.orderNo, /^AC\d+$/);
  assert.equal(created.ownerEmail, "customer@example.com");

  assert.deepEqual(created.estimatedQuote, {
    deliveryMethod: "TO_WAREHOUSE",
    actualWeightKg: 6.5,
    volumetricWeightKg: 7.06,
    chargeableWeightKg: 14.11,
    amount: 1334.09,
    firstMileAmount: 1305,
    lastMileAmount: 29.09,
    totalAmount: 1334.09,
    currency: "CNY",
    cdekTariffCode: 139,
    cdekDeliveryMinDays: 1,
    cdekDeliveryMaxDays: 2
  });
  const otherOrder = await service.createOrder({
    ...createOrderInput,
    ownerEmail: "other@example.com"
  });
  assert.deepEqual(
    (await service.listOrders("customer@example.com")).map((order) => order.id),
    [created.id]
  );
  assert.equal((await service.listOrders()).length, 0);
  assert.equal((await service.listAdminOrders()).some((order) => order.id === created.id), true);
  assert.equal((await service.listAdminOrders()).some((order) => order.id === otherOrder.id), true);

  const routePrefixes = [
    ["air-ems", "AE"],
    ["land-cdek", "CC"],
    ["land-russia-post", "CR"]
  ] as const;

  for (const [routeId, prefix] of routePrefixes) {
    const {
      weightKg: _weightKg,
      lengthCm: _lengthCm,
      widthCm: _widthCm,
      heightCm: _heightCm,
      packageCount: _packageCount,
      ...createOrderInputWithoutMeasurements
    } = createOrderInput;
    const routeOrder = await service.createOrder({
      ...createOrderInputWithoutMeasurements,
      routeId
    });

    assert.equal(routeOrder.routeId, routeId);
    assert.match(routeOrder.orderNo, new RegExp(`^${prefix}\\d+$`));
  }

  const directory = mkdtempSync(join(tmpdir(), "ground-logistics-orders-"));
  const storePath = join(directory, "logistics-orders.json");

  try {
    const persistentService = new LogisticsService(
      new FixedCarrierProvider(),
      new StubCdekCarrierProvider(),
      storePath
    );
    const persistedOrder = await persistentService.createOrder(createOrderInput);
    const reloadedService = new LogisticsService(
      new FixedCarrierProvider(),
      new StubCdekCarrierProvider(),
      storePath
    );
    assert.equal((await reloadedService.getOrder(persistedOrder.id)).orderNo, persistedOrder.orderNo);
    await reloadedService.discardOrder(persistedOrder.id);
    const afterDiscardReload = new LogisticsService(
      new FixedCarrierProvider(),
      new StubCdekCarrierProvider(),
      storePath
    );
    await assert.rejects(() => afterDiscardReload.getOrder(persistedOrder.id), /not found/i);
  } finally {
    rmSync(directory, { force: true, recursive: true });
    rmSync(isolatedDirectory, { force: true, recursive: true });
  }
};

void run();
