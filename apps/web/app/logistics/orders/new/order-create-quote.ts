import type { CargoType, CurrencyCode, LogisticsDeliveryMethod, LogisticsQuoteRequest, LogisticsRouteId, SupportedDestinationCountry } from "@ground/shared";

interface OrderCreateQuoteFields {
  cargoType: CargoType;
  recipientCountry: SupportedDestinationCountry;
  recipientCity: string;
  recipientPostalCode: string;
  recipientAddressLine: string;
  deliveryMethod: LogisticsDeliveryMethod;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
}

export type OrderCreateQuotePayload = LogisticsQuoteRequest & { currency: CurrencyCode };

const positiveNumber = (value: string) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export function buildOrderCreateQuotePayload(fields: OrderCreateQuoteFields): OrderCreateQuotePayload | null {
  const destinationCity = fields.recipientCity.trim();
  const destinationPostalCode = fields.recipientPostalCode.trim();
  const destinationAddressLine = fields.recipientAddressLine.trim();
  const weightKg = positiveNumber(fields.weightKg);
  const lengthCm = positiveNumber(fields.lengthCm);
  const widthCm = positiveNumber(fields.widthCm);
  const heightCm = positiveNumber(fields.heightCm);

  if (!destinationCity || !destinationPostalCode || !destinationAddressLine || !weightKg || !lengthCm || !widthCm || !heightCm) {
    return null;
  }

  return {
    cargoType: fields.cargoType,
    destinationCountry: fields.recipientCountry,
    destinationCity,
    destinationPostalCode,
    destinationAddressLine,
    deliveryMethod: fields.deliveryMethod,
    currency: "CNY",
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageCount: 1
  };
}

export function getOrderCreateQuotePayloadKey(payload: OrderCreateQuotePayload, routeId: LogisticsRouteId) {
  return JSON.stringify({ payload, routeId });
}
