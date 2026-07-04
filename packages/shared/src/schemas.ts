import { z } from "zod";

export const cargoTypeSchema = z.enum(["B2B", "B2C"]);
export const supportedDestinationCountrySchema = z.enum(["Russia", "Kazakhstan", "Belarus"]);
export const currencyCodeSchema = z.enum(["CNY", "USD"]);
export const logisticsDeliveryMethodSchema = z.enum(["TO_DOOR", "TO_WAREHOUSE"]);
export const logisticsRouteIdSchema = z.enum(["air-ems", "air-cdek", "land-cdek", "land-russia-post"]);

export const addressContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  country: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  addressLine: z.string().min(1),
  locationCode: z.string().min(1).optional(),
  fiasGuid: z.string().min(1).optional()
});

export const cargoItemSchema = z.object({
  name: z.string().min(1),
  unitValueCny: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive()
});

export const logisticsQuoteRequestSchema = z.object({
  cargoType: cargoTypeSchema,
  destinationCountry: supportedDestinationCountrySchema,
  destinationCity: z.string().min(1),
  deliveryMethod: logisticsDeliveryMethodSchema.default("TO_DOOR"),
  currency: currencyCodeSchema,
  weightKg: z.coerce.number().positive(),
  lengthCm: z.coerce.number().positive(),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  packageCount: z.coerce.number().int().positive(),
  destinationPostalCode: z.string().min(1).optional(),
  destinationAddressLine: z.string().min(1).optional(),
  destinationLocationCode: z.string().min(1).optional(),
  destinationFiasGuid: z.string().min(1).optional()
});

export const logisticsOrderCreateSchema = z.object({
  cargoType: cargoTypeSchema,
  routeId: logisticsRouteIdSchema.optional(),
  sender: addressContactSchema,
  recipient: addressContactSchema,
  cargoItems: z.array(cargoItemSchema).min(1).optional(),
  goodsName: z.string().min(1).optional(),
  declaredValue: z.coerce.number().nonnegative().optional(),
  declaredCurrency: currencyCodeSchema.optional(),
  taxIdOrDocumentNo: z.string().min(1).optional(),
  weightKg: z.coerce.number().positive().optional(),
  lengthCm: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  packageCount: z.coerce.number().int().positive().optional()
});

export const shopOrderCreateSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      skuId: z.string().min(1),
      quantity: z.coerce.number().int().positive()
    })
  ).min(1),
  recipient: addressContactSchema
});
