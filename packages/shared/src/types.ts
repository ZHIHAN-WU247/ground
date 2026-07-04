export type CargoType = "B2B" | "B2C";

export type SupportedDestinationCountry = "Russia" | "Kazakhstan" | "Belarus";

export type LogisticsStatus =
  | "UNDER_REVIEW"
  | "REJECTED"
  | "APPROVED"
  | "ACCEPTED"
  | "TRANSFER_TO_HUB"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVED_CUSTOMS_WAREHOUSE"
  | "CUSTOMS_CLEARANCE"
  | "CUSTOMS_RELEASED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION";

export type LogisticsReviewState = "PENDING" | "TRACKING_FAILED" | "APPROVED" | "REJECTED";

export type LogisticsTrackingSource = "AUTO" | "MANUAL";

export type CarrierCreateState = "NOT_SUBMITTED" | "SUBMITTED" | "NUMBER_READY" | "FAILED";

export type CarrierLabelStatus = "NOT_REQUESTED" | "SUBMITTED" | "PROCESSING" | "READY" | "EXPIRED" | "FAILED";

export type CarrierTrackingSyncStatus = "NOT_STARTED" | "SYNCED" | "FAILED";

export type LogisticsStatusGroup =
  | "ALL"
  | "REVIEW_QUEUE"
  | "PENDING_SHIPMENT"
  | "INTERNATIONAL_TRANSIT"
  | "LAST_MILE"
  | "COMPLETED"
  | "ATTENTION";

export type ShopOrderStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "LINKED_TO_LOGISTICS" | "CANCELLED";

export type CurrencyCode = "CNY" | "USD" | "RUB";

export type LogisticsDeliveryMethod = "TO_DOOR" | "TO_WAREHOUSE";

export type LogisticsRouteId = "air-ems" | "air-cdek" | "land-cdek" | "land-russia-post";

export const logisticsRouteCodeMap: Record<LogisticsRouteId, string> = {
  "air-ems": "AE",
  "air-cdek": "AC",
  "land-cdek": "CC",
  "land-russia-post": "CR"
};

export interface AddressContact {
  name: string;
  phone: string;
  email?: string;
  country: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  locationCode?: string;
  fiasGuid?: string;
}

export interface CargoItem {
  name: string;
  unitValueCny: number;
  quantity: number;
}

export interface LogisticsQuoteRequest {
  cargoType: CargoType;
  destinationCountry: SupportedDestinationCountry;
  destinationCity: string;
  deliveryMethod?: LogisticsDeliveryMethod;
  currency: CurrencyCode;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  destinationPostalCode?: string;
  destinationAddressLine?: string;
  destinationLocationCode?: string;
  destinationFiasGuid?: string;
}

export interface LogisticsQuote {
  id: string;
  cargoType: CargoType;
  destinationCountry: SupportedDestinationCountry;
  destinationCity: string;
  deliveryMethod: LogisticsDeliveryMethod;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  amount: number;
  firstMileAmount: number;
  lastMileAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  cdekTariffCode?: number;
  cdekDeliveryMinDays?: number;
  cdekDeliveryMaxDays?: number;
  exchangeRateNote?: string;
  breakdown: Array<{
    label: string;
    amount: number;
  }>;
}

export interface LogisticsQuoteSnapshot {
  deliveryMethod: LogisticsDeliveryMethod;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  amount: number;
  firstMileAmount: number;
  lastMileAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  cdekTariffCode?: number;
  cdekDeliveryMinDays?: number;
  cdekDeliveryMaxDays?: number;
  exchangeRateNote?: string;
}

export interface TrackingEvent {
  id: string;
  status: LogisticsStatus;
  title: string;
  description: string;
  location: string;
  occurredAt: string;
  source: "MANUAL" | "CARRIER_API";
}

export interface LogisticsOrder {
  id: string;
  orderNo: string;
  cargoType: CargoType;
  routeId?: LogisticsRouteId;
  status: LogisticsStatus;
  reviewState: LogisticsReviewState;
  carrierName?: string;
  carrierCreateState?: CarrierCreateState;
  carrierEntityUuid?: string;
  carrierRequestUuid?: string;
  carrierRawStatus?: string;
  carrierLastError?: string;
  sender: AddressContact;
  recipient: AddressContact;
  cargoItems?: CargoItem[];
  goodsName: string;
  declaredValue: number;
  declaredCurrency: CurrencyCode;
  taxIdOrDocumentNo: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packageCount: number;
  cdekTariffCode?: number;
  trackingNo?: string;
  carrierReferenceNo?: string;
  trackingSource?: LogisticsTrackingSource;
  labelUuid?: string;
  labelStatus?: CarrierLabelStatus;
  labelUrl?: string;
  labelLastError?: string;
  trackingSyncStatus?: CarrierTrackingSyncStatus;
  trackingSyncedAt?: string;
  reviewFailureReason?: string;
  lastMileTrackingNo?: string;
  estimatedQuote?: LogisticsQuoteSnapshot;
  events: TrackingEvent[];
  createdAt: string;
}

export interface ProductSku {
  id: string;
  model: string;
  size: string;
  price: number;
  currency: CurrencyCode;
  stockLabel: string;
}

export type ProductCategorySlug = "daily" | "tops" | "pants" | "shoes" | "accessories";

export interface ProductCategory {
  slug: ProductCategorySlug;
  label: string;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  imageUrl: string;
  galleryImageUrls?: string[];
  isPublished: boolean;
  categorySlug: ProductCategorySlug;
  category: string;
  salesLabel?: string;
  originLabel?: string;
  serviceLabels?: string[];
  detailSections?: Array<{
    title: string;
    body: string;
    imageUrl?: string;
  }>;
  skus: ProductSku[];
}

export type CreateProductInput = Omit<Product, "id" | "skus"> & {
  skus: Array<Omit<ProductSku, "id">>;
};

export interface ShopOrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string;
  skuId: string;
  skuModel: string;
  skuSize: string;
  quantity: number;
  unitPrice: number;
}

export interface ShopOrder {
  id: string;
  orderNo: string;
  status: ShopOrderStatus;
  items: ShopOrderItem[];
  recipient: AddressContact;
  totalAmount: number;
  currency: CurrencyCode;
  logisticsOrderId?: string;
  logisticsReferenceNo?: string;
  createdAt: string;
}

export interface RecipientAddress extends AddressContact {
  id: string;
  label: string;
}
