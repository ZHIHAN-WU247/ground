import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FixedCarrierProvider } from "../carrier/fixed-carrier.provider";
import { CdekCarrierProvider } from "../carrier/cdek-carrier.provider";
import { LogisticsService } from "./logistics.service";

class StubCdekCarrierProvider extends CdekCarrierProvider {
  override async calculateQuote(input: Parameters<CdekCarrierProvider["calculateQuote"]>[0]) {
    return {
      id: "quote-cdek-1",
      cargoType: "B2C" as const,
      destinationCountry: "Russia" as const,
      destinationCity: "Moscow",
      deliveryMethod: input.deliveryMethod ?? "TO_DOOR" as const,
      actualWeightKg: 6.5,
      volumetricWeightKg: 7.06,
      chargeableWeightKg: 14.11,
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

const run = async () => {
  const isolatedDirectory = mkdtempSync(join(tmpdir(), "ground-logistics-isolated-"));
  const service = new LogisticsService(
    new FixedCarrierProvider(),
    new StubCdekCarrierProvider(),
    join(isolatedDirectory, "logistics-orders.json")
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
    amount: 320,
    firstMileAmount: 0,
    lastMileAmount: 320,
    totalAmount: 320,
    currency: "RUB",
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
