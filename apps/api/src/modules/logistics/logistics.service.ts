import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type {
  CargoItem,
  CurrencyCode,
  LogisticsOrder,
  LogisticsPricingRouteConfig,
  LogisticsQuote,
  LogisticsQuoteRequest,
  LogisticsRegionCityConfig,
  LogisticsRegionCountryConfig,
  LogisticsQuoteSnapshot,
  LogisticsReviewState,
  LogisticsRouteId,
  LogisticsStatus,
  LogisticsStatusGroup,
  LogisticsTrackingSource,
  TrackingEvent
} from "@ground/shared";
import { logisticsRouteCodeMap, sampleLogisticsOrders } from "@ground/shared";
import { FixedCarrierProvider } from "../carrier/fixed-carrier.provider";
import type { CreateLogisticsOrderDto } from "./dto/create-logistics-order.dto";
import type { ManualTrackingNumberDto } from "./dto/manual-tracking-number.dto";
import type { ReviewOrderDto } from "./dto/review-order.dto";
import type { TrackingEventDto } from "./dto/tracking-event.dto";
import { CdekCarrierProvider } from "../carrier/cdek-carrier.provider";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseCustomerRiskGuard, type SupabaseCustomerRiskClient } from "../customer-risk/supabase-customer-risk-guard";
import { SupabaseLogisticsOrderStore, type SupabaseLogisticsOrderClient } from "./supabase-logistics-order-store";
import { SupabasePricingConfigStore, type SupabasePricingConfigClient, defaultPricingRouteConfigs } from "./supabase-pricing-config-store";
import { SupabaseRegionConfigStore, type SupabaseRegionConfigClient } from "./supabase-region-config-store";
import { defaultLogisticsRegionConfigs } from "@ground/shared";

const statusGroupMap: Record<Exclude<LogisticsStatusGroup, "ALL">, LogisticsStatus[]> = {
  REVIEW_QUEUE: ["UNDER_REVIEW"],
  PENDING_SHIPMENT: ["APPROVED", "ACCEPTED", "TRANSFER_TO_HUB"],
  INTERNATIONAL_TRANSIT: ["DISPATCHED", "IN_TRANSIT", "ARRIVED_CUSTOMS_WAREHOUSE", "CUSTOMS_CLEARANCE", "CUSTOMS_RELEASED"],
  LAST_MILE: ["OUT_FOR_DELIVERY"],
  COMPLETED: ["DELIVERED"],
  ATTENTION: ["REJECTED", "EXCEPTION"]
};

export const LOGISTICS_STORE_PATH = "LOGISTICS_STORE_PATH";

@Injectable()
export class LogisticsService {
  private readonly orders: LogisticsOrder[];
  private readonly orderStore?: SupabaseLogisticsOrderStore;
  private readonly pricingConfigStore?: SupabasePricingConfigStore;
  private readonly regionConfigStore?: SupabaseRegionConfigStore;
  private readonly customerRiskGuard?: SupabaseCustomerRiskGuard;
  private readonly cdekOriginLocation = {
    country: "Russia",
    province: "Moscow",
    city: "Moscow",
    postalCode: "101000",
    addressLine: "Tverskaya Street 1",
    locationCode: "44",
    fiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
  } as const;

  constructor(
    private readonly carrierProvider: FixedCarrierProvider,
    private readonly cdekCarrierProvider: CdekCarrierProvider,
    @Optional() @Inject(LOGISTICS_STORE_PATH)
    private readonly storePath = resolve(process.cwd(), "data/logistics-orders.json"),
    @Optional() private readonly supabaseService?: SupabaseService
  ) {
    this.orders = this.readOrders();

    if (this.supabaseService?.client) {
      this.orderStore = new SupabaseLogisticsOrderStore(this.supabaseService.client as unknown as SupabaseLogisticsOrderClient);
      this.pricingConfigStore = new SupabasePricingConfigStore(this.supabaseService.client as unknown as SupabasePricingConfigClient);
      this.regionConfigStore = new SupabaseRegionConfigStore(this.supabaseService.client as unknown as SupabaseRegionConfigClient);
      this.customerRiskGuard = new SupabaseCustomerRiskGuard(this.supabaseService.client as unknown as SupabaseCustomerRiskClient);
    }
  }

  async listRegionConfigs(): Promise<LogisticsRegionCountryConfig[]> {
    if (!this.regionConfigStore) {
      return defaultLogisticsRegionConfigs;
    }

    await this.regionConfigStore.seedDefaultsIfEmpty();
    return this.regionConfigStore.listRegions();
  }

  async updateRegionCountry(isoCode: string, patch: Partial<Pick<LogisticsRegionCountryConfig, "isActive" | "name">>): Promise<LogisticsRegionCountryConfig> {
    if (!this.regionConfigStore) {
      throw new BadRequestException("Supabase is required to update region config.");
    }

    await this.regionConfigStore.seedDefaultsIfEmpty();
    return this.regionConfigStore.updateCountry(isoCode, patch);
  }

  async updateRegionCity(cityId: string, patch: Partial<LogisticsRegionCityConfig>): Promise<LogisticsRegionCityConfig> {
    if (!this.regionConfigStore) {
      throw new BadRequestException("Supabase is required to update region config.");
    }

    await this.regionConfigStore.seedDefaultsIfEmpty();
    return this.regionConfigStore.updateCity(cityId, patch);
  }

  async listPricingRouteConfigs(): Promise<LogisticsPricingRouteConfig[]> {
    if (!this.pricingConfigStore) {
      return defaultPricingRouteConfigs;
    }

    await this.pricingConfigStore.seedDefaultsIfEmpty();
    return this.pricingConfigStore.listRouteConfigs();
  }

  async updatePricingRouteConfig(routeId: LogisticsRouteId, patch: Partial<LogisticsPricingRouteConfig>): Promise<LogisticsPricingRouteConfig> {
    if (!this.pricingConfigStore) {
      throw new BadRequestException("Supabase is required to update pricing config.");
    }

    await this.pricingConfigStore.seedDefaultsIfEmpty();
    return this.pricingConfigStore.updateRouteConfig(routeId, patch);
  }

  async listOrders(ownerEmail?: string): Promise<LogisticsOrder[]> {
    if (this.orderStore) {
      return this.orderStore.listOrders(ownerEmail);
    }

    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);

    if (!normalizedOwnerEmail) {
      return [];
    }

    return this.orders.filter((order) => order.ownerEmail === normalizedOwnerEmail);
  }

  async listAdminOrders(statusGroup: LogisticsStatusGroup = "ALL"): Promise<LogisticsOrder[]> {
    const orders = this.orderStore ? await this.orderStore.listAdminOrders() : this.orders;

    if (statusGroup === "ALL") {
      return orders;
    }

    const targetStatuses = statusGroupMap[statusGroup];
    return orders.filter((order) => targetStatuses.includes(order.status));
  }

  async getOrder(idOrTrackingNo: string, ownerEmail?: string): Promise<LogisticsOrder> {
    if (this.orderStore) {
      return this.orderStore.getOrder(idOrTrackingNo, ownerEmail);
    }

    const normalizedOwnerEmail = this.normalizeOwnerEmail(ownerEmail);
    const order = this.orders.find((item) => {
      const matchesIdentifier = item.id === idOrTrackingNo || item.orderNo === idOrTrackingNo || item.trackingNo === idOrTrackingNo;
      return matchesIdentifier && (!normalizedOwnerEmail || item.ownerEmail === normalizedOwnerEmail);
    });

    if (!order) {
      throw new NotFoundException("Logistics order was not found.");
    }

    return order;
  }

  async createQuote(input: LogisticsQuoteRequest): Promise<LogisticsQuote> {
    return this.cdekCarrierProvider.calculateQuote(input);
  }

  async createOrder(input: CreateLogisticsOrderDto): Promise<LogisticsOrder> {
    const routeId = input.routeId ?? "air-cdek";
    const { id, orderNo } = this.generateOrderIdentity(routeId);
    const sender = this.normalizeCdekSenderOrigin(input.sender);
    const cargoItems = this.normalizeCargoItems(input);
    const hasCargoItems = cargoItems.length > 0;
    const goodsName = hasCargoItems ? cargoItems.map((item) => item.name).join(", ") : input.goodsName?.trim();
    const declaredCurrency: CurrencyCode = hasCargoItems ? "CNY" : input.declaredCurrency ?? "CNY";
    const declaredValue = hasCargoItems ? this.calculateCargoItemsValue(cargoItems) : input.declaredValue;
    const packageMeasurements = this.normalizePackageMeasurements(input);

    if (!goodsName || !declaredValue || declaredValue <= 0) {
      throw new BadRequestException("At least one cargo item with a positive declared value is required.");
    }

    const estimatedQuote = packageMeasurements.isComplete
      ? await this.buildOrderQuoteSnapshot({
          cargoType: input.cargoType,
          deliveryMethod: input.deliveryMethod ?? "TO_DOOR",
          recipient: input.recipient,
          declaredCurrency,
          weightKg: packageMeasurements.weightKg,
          lengthCm: packageMeasurements.lengthCm,
          widthCm: packageMeasurements.widthCm,
          heightCm: packageMeasurements.heightCm,
          packageCount: packageMeasurements.packageCount
        })
      : undefined;
    const ownerEmail = this.normalizeOwnerEmail(input.ownerEmail);
    await this.customerRiskGuard?.assertCanCreateOrder(ownerEmail);
    const order: LogisticsOrder = {
      id,
      orderNo,
      ...(ownerEmail ? { ownerEmail } : {}),
      cargoType: input.cargoType,
      routeId,
      deliveryMethod: input.deliveryMethod ?? "TO_DOOR",
      status: "UNDER_REVIEW",
      reviewState: "PENDING",
      sender,
      recipient: input.recipient,
      ...(hasCargoItems ? { cargoItems } : {}),
      goodsName,
      declaredValue,
      declaredCurrency,
      taxIdOrDocumentNo: input.taxIdOrDocumentNo?.trim() ?? "",
      weightKg: packageMeasurements.weightKg,
      lengthCm: packageMeasurements.lengthCm,
      widthCm: packageMeasurements.widthCm,
      heightCm: packageMeasurements.heightCm,
      packageCount: packageMeasurements.packageCount,
      carrierName: "CDEK",
      carrierCreateState: "NOT_SUBMITTED",
      labelStatus: "NOT_REQUESTED",
      trackingSyncStatus: "NOT_STARTED",
      ...(estimatedQuote ? { estimatedQuote } : {}),
      events: [
        this.createEvent("UNDER_REVIEW", "Order submitted", "Customer submitted a logistics order and is waiting for operations review.", sender.city)
      ],
      createdAt: new Date().toISOString()
    };

    if (this.orderStore) {
      return this.orderStore.createOrder(order);
    }

    this.persistOrders([order, ...this.orders]);
    this.orders.unshift(order);
    return order;
  }

  async discardOrder(orderId: string): Promise<void> {
    if (this.orderStore) {
      await this.orderStore.deleteOrder(orderId);
      return;
    }

    const index = this.orders.findIndex((order) => order.id === orderId);

    if (index === -1) {
      return;
    }

    const orders = this.orders.filter((order) => order.id !== orderId);
    this.persistOrders(orders);
    this.orders.splice(index, 1);
  }

  async reviewOrder(orderId: string, input: ReviewOrderDto): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);
    this.applyCorrections(order, input);

    if (input.decision === "REJECT") {
      order.status = "REJECTED";
      order.reviewState = "REJECTED";
      order.reviewFailureReason = input.reason?.trim() || "Order review rejected by operations.";
      order.events.unshift(this.createEvent("REJECTED", "Review rejected", input.reason ?? "Order review completed with rejection.", "Operations"));
      return this.saveOrder(order);
    }

    order.status = this.isInboundState(order.status) ? order.status : "APPROVED";
    order.reviewState = "APPROVED";
    delete order.reviewFailureReason;

    if (order.trackingNo) {
      return this.saveOrder(order);
    }

    const releasedOrder = await this.releaseCdekOrder(order, "Automatic CDEK order release failed");
    return this.saveOrder(releasedOrder);
  }

  async retryTrackingNumberAssignment(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (order.status === "REJECTED") {
      throw new BadRequestException("Rejected orders cannot retry carrier number assignment.");
    }

    if (order.trackingNo) {
      return order;
    }

    const releasedOrder = await this.releaseCdekOrder(order, "Automatic CDEK order retry failed");
    return this.saveOrder(releasedOrder);
  }

  async assignManualTrackingNumber(orderId: string, input: ManualTrackingNumberDto): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (order.status === "REJECTED") {
      throw new BadRequestException("Rejected orders cannot receive a tracking number.");
    }

    const trackingNo = input.trackingNo.trim();
    const carrierReferenceNo = input.carrierReferenceNo.trim();

    if (!trackingNo || !carrierReferenceNo) {
      throw new BadRequestException("Tracking number and carrier reference number are required.");
    }

    const orders = this.orderStore ? await this.orderStore.listAdminOrders() : this.orders;

    if (orders.some((item) => item.id !== order.id && item.trackingNo === trackingNo)) {
      throw new BadRequestException("Tracking number is already in use.");
    }

    const updatedOrder = this.applyApprovedTracking(order, {
      trackingNo,
      carrierReferenceNo,
      trackingSource: "MANUAL",
      title: "Tracking number assigned manually",
      description: "Operations manually filled the tracking number after the carrier API fallback path was used."
    });
    return this.saveOrder(updatedOrder);
  }

  async markInbound(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (order.status !== "APPROVED" || !order.trackingNo) {
      throw new BadRequestException("Only reviewed orders with a tracking number can be marked inbound.");
    }

    order.status = "ACCEPTED";
    order.events.unshift(this.createEvent("ACCEPTED", "Inbound completed", "Warehouse completed inbound for the reviewed order.", order.sender.city));
    return this.saveOrder(order);
  }

  async addManualTrackingEvent(orderId: string, input: TrackingEventDto): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);
    order.status = input.status;
    order.events.unshift(this.createEvent(input.status, input.title, input.description, input.location));
    return this.saveOrder(order);
  }

  async createLastMileOrder(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (!order.trackingNo) {
      throw new BadRequestException("Create or manually assign the primary tracking number before creating a last-mile order.");
    }

    const result = await this.carrierProvider.createLastMileOrder(order);
    order.lastMileTrackingNo = result.lastMileTrackingNo;
    return this.saveOrder(order);
  }

  async syncLastMileTracking(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);
    const events = await this.carrierProvider.pullTrackingEvents(order);
    order.events.unshift(...events);
    const latestStatus = events[0]?.status;

    if (latestStatus) {
      order.status = latestStatus;
    }

    return this.saveOrder(order);
  }

  async handshakeCdek() {
    return this.cdekCarrierProvider.handshake();
  }

  async createCdekLabel(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    try {
      const label = await this.cdekCarrierProvider.createLabel(order);
      order.labelUuid = label.labelUuid;
      order.labelStatus = label.status;
      delete order.labelLastError;
      order.events.unshift(this.createEvent("APPROVED", "CDEK label requested", "Operations requested a CDEK barcode label for this order.", "CDEK"));
      return this.refreshCdekLabel(order.id);
    } catch (error) {
      order.labelStatus = "FAILED";
      order.labelLastError = this.getFailureReason(error, "CDEK label generation failed");
      return this.saveOrder(order);
    }
  }

  async refreshCdekLabel(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (!order.labelUuid) {
      throw new BadRequestException("Create a CDEK label before refreshing it.");
    }

    try {
      const label = await this.cdekCarrierProvider.getLabel(order.labelUuid);
      order.labelUuid = label.labelUuid;
      order.labelStatus = label.status;
      if (label.url) {
        order.labelUrl = label.url;
      } else {
        delete order.labelUrl;
      }
      delete order.labelLastError;
      return this.saveOrder(order);
    } catch (error) {
      order.labelStatus = "FAILED";
      order.labelLastError = this.getFailureReason(error, "CDEK label refresh failed");
      return this.saveOrder(order);
    }
  }

  async syncCdekTracking(orderId: string): Promise<LogisticsOrder> {
    const order = await this.getOrder(orderId);

    if (!order.trackingNo) {
      throw new BadRequestException("CDEK tracking requires a carrier tracking number.");
    }

    try {
      const result = await this.cdekCarrierProvider.pullTrackingEvents(order.trackingNo);
      const knownEventIds = new Set(order.events.map((event) => event.id));
      const newEvents = result.events.filter((event) => !knownEventIds.has(event.id));
      order.events.unshift(...newEvents);
      order.trackingSyncStatus = "SYNCED";
      order.trackingSyncedAt = new Date().toISOString();
      delete order.carrierLastError;

      const latestStatus = result.events.sort((current, next) => new Date(next.occurredAt).getTime() - new Date(current.occurredAt).getTime())[0]?.status;

      if (latestStatus) {
        order.status = latestStatus;
      }

      return this.saveOrder(order);
    } catch (error) {
      order.trackingSyncStatus = "FAILED";
      order.carrierLastError = this.getFailureReason(error, "CDEK tracking sync failed");
      return this.saveOrder(order);
    }
  }

  private async releaseCdekOrder(
    order: LogisticsOrder,
    failureReasonPrefix: string
  ): Promise<LogisticsOrder> {
    const approvalAlreadyGranted = order.reviewState === "APPROVED";

    try {
      const result = order.carrierEntityUuid ? await this.cdekCarrierProvider.getOrder(order.carrierEntityUuid) : await this.cdekCarrierProvider.createOrder(order);
      order.carrierName = "CDEK";
      order.carrierCreateState = result.cdekNumber ? "NUMBER_READY" : "SUBMITTED";
      order.carrierEntityUuid = result.entityUuid;
      if (result.requestUuid) {
        order.carrierRequestUuid = result.requestUuid;
      } else {
        delete order.carrierRequestUuid;
      }

      if (result.state) {
        order.carrierRawStatus = result.state;
      } else {
        delete order.carrierRawStatus;
      }

      if (!result.cdekNumber) {
        if (this.isTerminalCdekFailureState(result.state)) {
          const failureReason = this.getCdekFailureReason(result.raw) ?? "CDEK rejected the order request before issuing a tracking number.";
          return this.applyCarrierReleaseFailure(order, failureReason, approvalAlreadyGranted, "CDEK order rejected");
        }

        return this.applyCarrierReleasePending(order, approvalAlreadyGranted);
      }

      return this.applyApprovedTracking(order, {
        trackingNo: result.cdekNumber,
        carrierReferenceNo: result.entityUuid,
        trackingSource: "AUTO",
        title: "CDEK order released",
        description: "Operations approved the order and CDEK returned the carrier tracking number."
      });
    } catch (error) {
      return this.applyCarrierReleaseFailure(order, this.getFailureReason(error, failureReasonPrefix), approvalAlreadyGranted, "CDEK order release failed");
    }
  }

  private applyApprovedTracking(
    order: LogisticsOrder,
    input: {
      trackingNo: string;
      carrierReferenceNo: string;
      trackingSource: LogisticsTrackingSource;
      title: string;
      description: string;
    }
  ): LogisticsOrder {
    order.status = this.isInboundState(order.status) ? order.status : "APPROVED";
    order.reviewState = "APPROVED";
    order.carrierCreateState = "NUMBER_READY";
    delete order.reviewFailureReason;
    delete order.carrierLastError;
    order.trackingNo = input.trackingNo;
    order.carrierReferenceNo = input.carrierReferenceNo;
    order.trackingSource = input.trackingSource;
    order.events.unshift(this.createEvent("APPROVED", input.title, input.description, "Operations"));
    return order;
  }

  private applyCorrections(order: LogisticsOrder, input: ReviewOrderDto) {
    if (input.correctedWeightKg !== undefined) {
      order.weightKg = input.correctedWeightKg;
    }

    if (input.correctedLengthCm !== undefined) {
      order.lengthCm = input.correctedLengthCm;
    }

    if (input.correctedWidthCm !== undefined) {
      order.widthCm = input.correctedWidthCm;
    }

    if (input.correctedHeightCm !== undefined) {
      order.heightCm = input.correctedHeightCm;
    }

    if (input.cdekTariffCode !== undefined) {
      order.cdekTariffCode = input.cdekTariffCode;
    }
  }

  private isInboundState(status: LogisticsStatus) {
    return status === "ACCEPTED" || status === "TRANSFER_TO_HUB" || status === "DISPATCHED" || status === "IN_TRANSIT" || status === "ARRIVED_CUSTOMS_WAREHOUSE" || status === "CUSTOMS_CLEARANCE" || status === "CUSTOMS_RELEASED" || status === "OUT_FOR_DELIVERY" || status === "DELIVERED";
  }

  private normalizeOwnerEmail(ownerEmail?: string) {
    return ownerEmail?.trim().toLowerCase() || undefined;
  }

  private normalizeCdekSenderOrigin(sender: LogisticsOrder["sender"]): LogisticsOrder["sender"] {
    return {
      ...sender,
      ...this.cdekOriginLocation
    };
  }

  private normalizeCargoItems(input: CreateLogisticsOrderDto): CargoItem[] {
    if (!input.cargoItems) {
      return [];
    }

    const items = input.cargoItems.map((item) => ({
      name: item.name.trim(),
      unitValueCny: this.roundMoney(item.unitValueCny),
      quantity: item.quantity
    }));

    if (items.some((item) => !item.name || item.unitValueCny <= 0 || item.quantity <= 0)) {
      throw new BadRequestException("Cargo items require name, positive RMB value, and positive quantity.");
    }

    return items;
  }

  private calculateCargoItemsValue(items: CargoItem[]) {
    return this.roundMoney(items.reduce((total, item) => total + item.unitValueCny * item.quantity, 0));
  }

  private normalizePackageMeasurements(input: CreateLogisticsOrderDto) {
    const values = [input.weightKg, input.lengthCm, input.widthCm, input.heightCm, input.packageCount];
    const hasAnyMeasurement = values.some((value) => value !== undefined);
    const isComplete = values.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0);

    if (hasAnyMeasurement && !isComplete) {
      throw new BadRequestException("Complete positive package measurements are required when any package measurement is provided.");
    }

    return {
      isComplete,
      weightKg: input.weightKg ?? 1,
      lengthCm: input.lengthCm ?? 1,
      widthCm: input.widthCm ?? 1,
      heightCm: input.heightCm ?? 1,
      packageCount: input.packageCount ?? 1
    };
  }

  private async buildOrderQuoteSnapshot(input: {
    cargoType: CreateLogisticsOrderDto["cargoType"];
    deliveryMethod: NonNullable<CreateLogisticsOrderDto["deliveryMethod"]>;
    recipient: CreateLogisticsOrderDto["recipient"];
    declaredCurrency: CurrencyCode;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  }): Promise<LogisticsQuoteSnapshot | undefined> {
    const quote = await this.createQuote({
      cargoType: input.cargoType,
      destinationCountry: input.recipient.country as LogisticsQuoteRequest["destinationCountry"],
      destinationCity: input.recipient.city,
      deliveryMethod: input.deliveryMethod,
      currency: input.declaredCurrency,
      weightKg: input.weightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      packageCount: input.packageCount,
      destinationPostalCode: input.recipient.postalCode,
      destinationAddressLine: input.recipient.addressLine,
      ...(input.recipient.locationCode ? { destinationLocationCode: input.recipient.locationCode } : {}),
      ...(input.recipient.fiasGuid ? { destinationFiasGuid: input.recipient.fiasGuid } : {})
    });

    return this.toQuoteSnapshot(quote);
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private generateOrderIdentity(routeId: LogisticsRouteId = "air-cdek") {
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
      String(now.getMilliseconds()).padStart(3, "0")
    ].join("");
    const randomSuffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const serial = `${timestamp}${randomSuffix}`;

    return {
      id: `log-${serial}`,
      orderNo: `${logisticsRouteCodeMap[routeId]}${serial}`
    };
  }

  private toQuoteSnapshot(quote: LogisticsQuote): LogisticsQuoteSnapshot {
    return {
      deliveryMethod: quote.deliveryMethod,
      actualWeightKg: quote.actualWeightKg,
      volumetricWeightKg: quote.volumetricWeightKg,
      chargeableWeightKg: quote.chargeableWeightKg,
      amount: quote.amount,
      firstMileAmount: quote.firstMileAmount,
      lastMileAmount: quote.lastMileAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      ...(quote.cdekTariffCode ? { cdekTariffCode: quote.cdekTariffCode } : {}),
      ...(quote.cdekDeliveryMinDays !== undefined ? { cdekDeliveryMinDays: quote.cdekDeliveryMinDays } : {}),
      ...(quote.cdekDeliveryMaxDays !== undefined ? { cdekDeliveryMaxDays: quote.cdekDeliveryMaxDays } : {}),
      ...(quote.exchangeRateNote ? { exchangeRateNote: quote.exchangeRateNote } : {})
    };
  }

  private isTerminalCdekFailureState(state?: string) {
    return state === "INVALID" || state === "ERROR";
  }

  private getCdekFailureReason(raw: unknown) {
    const root = this.asRecord(raw);
    const errors = this.collectCdekErrorMessages(root.errors);

    if (errors.length > 0) {
      return errors.join(" | ");
    }

    const requests = Array.isArray(root.requests) ? root.requests : [];

    for (const request of requests) {
      const requestErrors = this.collectCdekErrorMessages(this.asRecord(request).errors);

      if (requestErrors.length > 0) {
        return requestErrors.join(" | ");
      }
    }

    return undefined;
  }

  private collectCdekErrorMessages(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        const error = this.asRecord(item);
        const message = this.asString(error.message) ?? this.asString(error.code);
        return message ? this.normalizeCarrierErrorMessage(message) : undefined;
      })
      .filter((message): message is string => Boolean(message));
  }

  private applyCarrierReleaseFailure(order: LogisticsOrder, failureReason: string, approvalAlreadyGranted: boolean, title: string) {
    const normalizedFailureReason = this.normalizeCarrierErrorMessage(failureReason);
    order.carrierCreateState = "FAILED";
    order.carrierLastError = normalizedFailureReason;

    if (approvalAlreadyGranted) {
      order.status = this.isInboundState(order.status) ? order.status : "APPROVED";
      order.reviewState = "APPROVED";
      delete order.reviewFailureReason;
      this.prependEventIfChanged(order, this.createEvent("EXCEPTION", title, normalizedFailureReason, "CDEK"));
      return order;
    }

    order.reviewState = "TRACKING_FAILED";
    order.reviewFailureReason = normalizedFailureReason;
    order.status = "UNDER_REVIEW";
    this.prependEventIfChanged(order, this.createEvent("EXCEPTION", title, normalizedFailureReason, "CDEK"));
    return order;
  }

  private applyCarrierReleasePending(order: LogisticsOrder, approvalAlreadyGranted: boolean) {
    delete order.carrierLastError;

    if (approvalAlreadyGranted) {
      order.status = this.isInboundState(order.status) ? order.status : "APPROVED";
      order.reviewState = "APPROVED";
      delete order.reviewFailureReason;
      this.prependEventIfChanged(
        order,
        this.createEvent("APPROVED", "CDEK order submitted", "CDEK accepted the order request. Waiting for carrier number resolution.", "CDEK")
      );
      return order;
    }

    order.reviewState = "TRACKING_FAILED";
    order.reviewFailureReason = "CDEK order was submitted, but cdek_number is not ready yet. Retry carrier release to fetch it.";
    order.status = "UNDER_REVIEW";
    this.prependEventIfChanged(
      order,
      this.createEvent("UNDER_REVIEW", "CDEK order submitted", "CDEK accepted the order request. Waiting for carrier number resolution.", "CDEK")
    );
    return order;
  }

  private async saveOrder(order: LogisticsOrder): Promise<LogisticsOrder> {
    if (this.orderStore) {
      return this.orderStore.saveOrder(order);
    }

    this.persistOrders(this.orders);
    return order;
  }

  private prependEventIfChanged(order: LogisticsOrder, event: TrackingEvent) {
    const latestEvent = order.events[0];

    if (
      latestEvent &&
      latestEvent.status === event.status &&
      latestEvent.title === event.title &&
      latestEvent.description === event.description &&
      latestEvent.location === event.location
    ) {
      return;
    }

    order.events.unshift(event);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private asString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private getFailureReason(error: unknown, fallback: string) {
    if (error instanceof Error && error.message.trim()) {
      return `${fallback}: ${this.normalizeCarrierErrorMessage(error.message)}`;
    }

    return fallback;
  }

  private normalizeCarrierErrorMessage(message: string) {
    const normalizedMessage = message.trim();

    if (normalizedMessage.includes("По данному направлению при заданных условиях выбранный тариф недоступен")) {
      return "Selected CDEK tariff is unavailable for the current route and shipment conditions.";
    }

    return normalizedMessage;
  }

  private readOrders(): LogisticsOrder[] {
    if (!existsSync(this.storePath)) {
      return structuredClone(sampleLogisticsOrders);
    }

    return JSON.parse(readFileSync(this.storePath, "utf8")) as LogisticsOrder[];
  }

  private persistOrders(orders: LogisticsOrder[]) {
    mkdirSync(dirname(this.storePath), { recursive: true });
    const temporaryPath = `${this.storePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(orders, null, 2), "utf8");
    renameSync(temporaryPath, this.storePath);
  }

  private createEvent(status: LogisticsStatus, title: string, description: string, location: string): TrackingEvent {
    return {
      id: `evt-${Date.now()}-${status}`,
      status,
      title,
      description,
      location,
      occurredAt: new Date().toISOString(),
      source: "MANUAL"
    };
  }
}
