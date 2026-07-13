import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { LogisticsOrder, LogisticsRouteId } from "@ground/shared";
import { AuditLogService } from "../audit/audit-log.service";
import { CarrierConfigService } from "../carrier/carrier-config.service";
import { UpdateCarrierConfigDto } from "../carrier/dto/update-carrier-config.dto";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { ListAdminLogisticsOrdersDto } from "./dto/list-admin-logistics-orders.dto";
import { ManualTrackingNumberDto } from "./dto/manual-tracking-number.dto";
import { ReviewOrderDto } from "./dto/review-order.dto";
import { TrackingEventDto } from "./dto/tracking-event.dto";
import { UpdateRegionCityDto } from "./dto/update-region-city.dto";
import { UpdateRegionCountryDto } from "./dto/update-region-country.dto";
import { UpdatePricingRouteConfigDto } from "./dto/update-pricing-route-config.dto";
import { LogisticsService } from "./logistics.service";

interface RequestWithUser {
  user?: AuthenticatedUser;
  ip?: string;
  headers: {
    "user-agent"?: string;
  };
}

@Controller("admin/logistics")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AdminLogisticsController {
  constructor(
    private readonly logisticsService: LogisticsService,
    private readonly carrierConfigService: CarrierConfigService,
    private readonly auditLogService: AuditLogService
  ) {}

  @Get("orders")
  listOrders(@Query() query: ListAdminLogisticsOrdersDto) {
    return this.logisticsService.listAdminOrders(query.statusGroup ?? "ALL");
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.logisticsService.getOrder(id);
  }

  @Get("carrier/cdek/handshake")
  handshakeCdek() {
    return this.logisticsService.handshakeCdek();
  }

  @Get("carrier/configs")
  listCarrierConfigs() {
    return this.carrierConfigService.listConfigs();
  }

  @Patch("carrier/configs/:providerCode")
  async updateCarrierConfig(@Param("providerCode") providerCode: string, @Body() input: UpdateCarrierConfigDto, @Req() request: RequestWithUser) {
    const config = await this.carrierConfigService.updateConfig(providerCode, input);
    await this.recordAudit(request, "logistics.carrier-config.update", "carrier_config", config.id, {
      providerCode: config.providerCode,
      displayName: config.displayName,
      apiBaseUrl: config.apiBaseUrl,
      credentialRef: config.credentialRef,
      isActive: config.isActive
    });
    return config;
  }

  @Get("pricing/routes")
  listPricingRouteConfigs() {
    return this.logisticsService.listPricingRouteConfigs();
  }

  @Patch("pricing/routes/:routeId")
  async updatePricingRouteConfig(@Param("routeId") routeId: string, @Body() input: UpdatePricingRouteConfigDto, @Req() request: RequestWithUser) {
    const config = await this.logisticsService.updatePricingRouteConfig(routeId as LogisticsRouteId, input);
    await this.recordAuditWithoutEntityId(request, "logistics.pricing-route.update", "pricing_route", {
      routeId: config.routeId,
      deliveryMethod: config.deliveryMethod,
      cargoType: config.cargoType,
      isActive: config.isActive,
      formula: config.formula,
      sortOrder: config.sortOrder
    });
    return config;
  }

  @Get("regions")
  listRegionConfigs() {
    return this.logisticsService.listRegionConfigs();
  }

  @Patch("regions/countries/:isoCode")
  async updateRegionCountry(@Param("isoCode") isoCode: string, @Body() input: UpdateRegionCountryDto, @Req() request: RequestWithUser) {
    const country = await this.logisticsService.updateRegionCountry(isoCode, input);
    await this.recordAudit(request, "logistics.region-country.update", "country", country.id, {
      id: country.id,
      isoCode: country.isoCode,
      name: country.name,
      isActive: country.isActive
    });
    return country;
  }

  @Patch("regions/cities/:cityId")
  async updateRegionCity(@Param("cityId") cityId: string, @Body() input: UpdateRegionCityDto, @Req() request: RequestWithUser) {
    const city = await this.logisticsService.updateRegionCity(cityId, input);
    await this.recordAudit(request, "logistics.region-city.update", "city", city.id, {
      id: city.id,
      countryIsoCode: city.countryIsoCode,
      name: city.name,
      isActive: city.isActive
    });
    return city;
  }

  @Patch("orders/:id/review")
  async reviewOrder(@Param("id") id: string, @Body() input: ReviewOrderDto, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.reviewOrder(id, input);
    await this.recordOrderAudit(request, "logistics.order.review", order);
    return order;
  }

  @Post("orders/:id/review/retry-tracking")
  async retryTracking(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.retryTrackingNumberAssignment(id);
    await this.recordOrderAudit(request, "logistics.order.retry-tracking", order);
    return order;
  }

  @Post("orders/:id/review/manual-tracking")
  async assignManualTrackingNumber(@Param("id") id: string, @Body() input: ManualTrackingNumberDto, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.assignManualTrackingNumber(id, input);
    await this.recordOrderAudit(request, "logistics.order.manual-tracking", order);
    return order;
  }

  @Post("orders/:id/inbound")
  async markInbound(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.markInbound(id);
    await this.recordOrderAudit(request, "logistics.order.inbound", order);
    return order;
  }

  @Post("orders/:id/tracking-events")
  async addTrackingEvent(@Param("id") id: string, @Body() input: TrackingEventDto, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.addManualTrackingEvent(id, input);
    await this.recordOrderAudit(request, "logistics.order.tracking-event.add", order);
    return order;
  }

  @Post("orders/:id/last-mile")
  async createLastMile(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.createLastMileOrder(id);
    await this.recordOrderAudit(request, "logistics.order.last-mile.create", order);
    return order;
  }

  @Post("orders/:id/last-mile/sync")
  async syncLastMile(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.syncLastMileTracking(id);
    await this.recordOrderAudit(request, "logistics.order.last-mile.sync", order);
    return order;
  }

  @Post("orders/:id/cdek/label")
  async createCdekLabel(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.createCdekLabel(id);
    await this.recordOrderAudit(request, "logistics.order.cdek-label.create", order);
    return order;
  }

  @Post("orders/:id/cdek/label/refresh")
  async refreshCdekLabel(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.refreshCdekLabel(id);
    await this.recordOrderAudit(request, "logistics.order.cdek-label.refresh", order);
    return order;
  }

  @Post("orders/:id/cdek/tracking/sync")
  async syncCdekTracking(@Param("id") id: string, @Req() request: RequestWithUser) {
    const order = await this.logisticsService.syncCdekTracking(id);
    await this.recordOrderAudit(request, "logistics.order.cdek-tracking.sync", order);
    return order;
  }

  private recordOrderAudit(request: RequestWithUser, action: string, order: LogisticsOrder) {
    return this.recordAudit(request, action, "logistics_order", order.id, {
      id: order.id,
      orderNo: order.orderNo,
      ownerEmail: order.ownerEmail ?? null,
      status: order.status,
      reviewState: order.reviewState,
      trackingNo: order.trackingNo ?? null,
      carrierReferenceNo: order.carrierReferenceNo ?? null,
      lastMileTrackingNo: order.lastMileTrackingNo ?? null,
      labelStatus: order.labelStatus ?? null,
      trackingSyncStatus: order.trackingSyncStatus ?? null
    });
  }

  private recordAuditWithoutEntityId(request: RequestWithUser, action: string, entityType: string, afterData: Record<string, unknown>) {
    return this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action,
      entityType,
      beforeData: null,
      afterData,
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
  }

  private recordAudit(request: RequestWithUser, action: string, entityType: string, entityId: string, afterData: Record<string, unknown>) {
    return this.auditLogService.recordLog({
      ...(request.user?.id ? { actorUserId: request.user.id } : {}),
      ...(request.user?.email ? { actorEmail: request.user.email } : {}),
      action,
      entityType,
      entityId,
      beforeData: null,
      afterData,
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
    });
  }
}
