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

export type LogisticsPricingFormula = "half_kg_step" | "cdek_first_last_mile" | "per_kg";

export interface LogisticsPricingRouteConfig {
  routeId: LogisticsRouteId;
  deliveryMethod: LogisticsDeliveryMethod;
  cargoType: CargoType;
  labelKey: string;
  noteKey: string;
  currency: CurrencyCode;
  isActive: boolean;
  formula: LogisticsPricingFormula;
  sortOrder: number;
  halfKgUnit: number;
  baseAmount?: number;
  stepAmount?: number;
  firstMileCnyPerKg?: number;
  perKgAmount?: number;
  rubPerCny?: number;
}

export const defaultLogisticsPricingRouteConfigs: LogisticsPricingRouteConfig[] = [
  {
    routeId: "air-ems",
    deliveryMethod: "TO_DOOR",
    cargoType: "B2C",
    labelKey: "quote.route.airEms",
    noteKey: "quote.route.airEms.note",
    currency: "CNY",
    isActive: true,
    formula: "half_kg_step",
    sortOrder: 0,
    halfKgUnit: 0.5,
    baseAmount: 185,
    stepAmount: 55
  },
  {
    routeId: "air-cdek",
    deliveryMethod: "TO_DOOR",
    cargoType: "B2C",
    labelKey: "quote.route.airCdek",
    noteKey: "quote.route.airCdek.note",
    currency: "CNY",
    isActive: true,
    formula: "cdek_first_last_mile",
    sortOrder: 1,
    halfKgUnit: 0.5,
    firstMileCnyPerKg: 90,
    rubPerCny: 11
  },
  {
    routeId: "land-cdek",
    deliveryMethod: "TO_WAREHOUSE",
    cargoType: "B2C",
    labelKey: "quote.route.landCdek",
    noteKey: "quote.route.landCdek.note",
    currency: "CNY",
    isActive: true,
    formula: "cdek_first_last_mile",
    sortOrder: 2,
    halfKgUnit: 0.5,
    firstMileCnyPerKg: 35,
    rubPerCny: 11
  },
  {
    routeId: "land-russia-post",
    deliveryMethod: "TO_WAREHOUSE",
    cargoType: "B2C",
    labelKey: "quote.route.landRussiaPost",
    noteKey: "quote.route.landRussiaPost.note",
    currency: "CNY",
    isActive: true,
    formula: "per_kg",
    sortOrder: 3,
    halfKgUnit: 0.5,
    perKgAmount: 55
  }
];

export interface LogisticsRegionCityConfig {
  id: string;
  countryIsoCode: string;
  name: string;
  region: string;
  postalCodeHint: string;
  locationCode?: string;
  fiasGuid?: string;
  isActive: boolean;
}

export interface LogisticsRegionCountryConfig {
  id: string;
  isoCode: string;
  name: string;
  isActive: boolean;
  cities: LogisticsRegionCityConfig[];
}

export const defaultLogisticsRegionConfigs: LogisticsRegionCountryConfig[] = [
  {
    id: "default-RU",
    isoCode: "RU",
    name: "Russia",
    isActive: true,
    cities: [
      {
        id: "default-RU-Moscow",
        countryIsoCode: "RU",
        name: "Moscow",
        region: "Moscow",
        postalCodeHint: "101000",
        locationCode: "44",
        fiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6",
        isActive: true
      },
      {
        id: "default-RU-Saint-Petersburg",
        countryIsoCode: "RU",
        name: "Saint Petersburg",
        region: "Saint Petersburg",
        postalCodeHint: "190000",
        isActive: true
      }
    ]
  },
  {
    id: "default-KZ",
    isoCode: "KZ",
    name: "Kazakhstan",
    isActive: true,
    cities: [
      {
        id: "default-KZ-Almaty",
        countryIsoCode: "KZ",
        name: "Almaty",
        region: "Almaty",
        postalCodeHint: "050000",
        isActive: true
      }
    ]
  },
  {
    id: "default-BY",
    isoCode: "BY",
    name: "Belarus",
    isActive: true,
    cities: [
      {
        id: "default-BY-Minsk",
        countryIsoCode: "BY",
        name: "Minsk",
        region: "Minsk",
        postalCodeHint: "220000",
        isActive: true
      }
    ]
  },
  {
    id: "default-CN",
    isoCode: "CN",
    name: "China",
    isActive: true,
    cities: [
      {
        id: "default-CN-Shenzhen",
        countryIsoCode: "CN",
        name: "Shenzhen",
        region: "Guangdong",
        postalCodeHint: "518000",
        isActive: true
      }
    ]
  }
];

export interface CarrierApiConfig {
  id: string;
  providerCode: string;
  displayName: string;
  apiBaseUrl: string;
  credentialRef: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export const defaultCarrierApiConfigs: CarrierApiConfig[] = [
  {
    id: "default-fixed",
    providerCode: "fixed",
    displayName: "Fixed mock carrier",
    apiBaseUrl: "",
    credentialRef: "",
    isActive: true,
    metadata: { mode: "mock" }
  },
  {
    id: "default-cdek",
    providerCode: "cdek",
    displayName: "CDEK",
    apiBaseUrl: "https://api.cdek.ru",
    credentialRef: "CDEK_CLIENT_ID/CDEK_CLIENT_SECRET",
    isActive: true,
    metadata: { mode: "api" }
  }
];

export interface CustomerDocument {
  id: string;
  documentType: string;
  documentNo: string;
  fileAssetId?: string;
  verifiedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CustomerDocumentReviewStatus = "approved" | "rejected" | "needs_revision";

export interface CustomerDocumentReviewUpdate {
  status: CustomerDocumentReviewStatus;
  note?: string;
}

export type FileVisibility = "public" | "private";

export interface FileAsset {
  id: string;
  ownerEmail?: string;
  bucket: string;
  objectPath: string;
  mimeType?: string;
  sizeBytes: number;
  visibility: FileVisibility;
  purpose: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FileAssetSignedUrl {
  asset: FileAsset;
  signedUrl: string;
  expiresIn: number;
}

export interface ContentBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageFileAssetId?: string;
  imageUrl?: string;
  href?: string;
  placement: string;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type AdminCustomerAddressKind = "sender" | "recipient";

export interface AdminCustomerAddress extends AddressContact {
  id: string;
  label: string;
  kind: AdminCustomerAddressKind;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminCustomerAddressInput = Omit<AdminCustomerAddress, "createdAt" | "updatedAt">;

export interface AdminCustomerShopOrderSummary {
  id: string;
  orderNo: string;
  status: ShopOrderStatus;
  totalAmount: number;
  currency: CurrencyCode;
  logisticsOrderId?: string;
  logisticsReferenceNo?: string;
  createdAt: string;
}

export interface AdminCustomerLogisticsOrderSummary {
  id: string;
  orderNo: string;
  status: LogisticsStatus;
  reviewState: LogisticsReviewState;
  cargoType: CargoType;
  routeId?: LogisticsRouteId;
  deliveryMethod: LogisticsDeliveryMethod;
  goodsName: string;
  weightKg: number;
  trackingNo?: string;
  carrierName?: string;
  createdAt: string;
}

export interface AdminCustomerOverview {
  email: string;
  profile?: AddressContact;
  riskProfile: AdminCustomerRiskProfile;
  addresses: AdminCustomerAddress[];
  documents: CustomerDocument[];
  fileAssets: FileAsset[];
  shopOrders: AdminCustomerShopOrderSummary[];
  logisticsOrders: AdminCustomerLogisticsOrderSummary[];
  summary: {
    addressCount: number;
    documentCount: number;
    fileAssetCount: number;
    shopOrderCount: number;
    logisticsOrderCount: number;
  };
}

export type AdminCustomerDocumentReviewFilter = CustomerDocumentReviewStatus | "pending";
export type AdminCustomerHasOrdersFilter = "all" | "true" | "false";

export interface AdminCustomerListQuery {
  search?: string;
  documentReviewStatus?: AdminCustomerDocumentReviewFilter | "all";
  hasOrders?: AdminCustomerHasOrdersFilter;
  page?: number;
  limit?: number;
}

export interface AdminCustomerListResult {
  items: AdminCustomerOverview[];
  total: number;
  page: number;
  limit: number;
}

export type AdminCustomerProfileUpdate = Omit<AddressContact, "email">;

export type AdminCustomerRiskLevel = "low" | "medium" | "high";

export interface AdminCustomerRiskProfile {
  adminNote: string;
  tags: string[];
  riskLevel: AdminCustomerRiskLevel;
  isBlacklisted: boolean;
  restrictionReason: string;
  followUpAt?: string;
}

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

export interface LogisticsRouteQuotePrice {
  routeId: LogisticsRouteId;
  labelKey: string;
  noteKey: string;
  amount: number;
  firstMileAmount: number;
  lastMileAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
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
  routePrices?: LogisticsRouteQuotePrice[];
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
  ownerEmail?: string;
  cargoType: CargoType;
  routeId?: LogisticsRouteId;
  deliveryMethod: LogisticsDeliveryMethod;
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
  ownerEmail?: string;
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
