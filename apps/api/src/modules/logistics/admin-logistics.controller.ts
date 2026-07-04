import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { ListAdminLogisticsOrdersDto } from "./dto/list-admin-logistics-orders.dto";
import { ManualTrackingNumberDto } from "./dto/manual-tracking-number.dto";
import { ReviewOrderDto } from "./dto/review-order.dto";
import { TrackingEventDto } from "./dto/tracking-event.dto";
import { LogisticsService } from "./logistics.service";

@Controller("admin/logistics")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AdminLogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

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

  @Patch("orders/:id/review")
  reviewOrder(@Param("id") id: string, @Body() input: ReviewOrderDto) {
    return this.logisticsService.reviewOrder(id, input);
  }

  @Post("orders/:id/review/retry-tracking")
  retryTracking(@Param("id") id: string) {
    return this.logisticsService.retryTrackingNumberAssignment(id);
  }

  @Post("orders/:id/review/manual-tracking")
  assignManualTrackingNumber(@Param("id") id: string, @Body() input: ManualTrackingNumberDto) {
    return this.logisticsService.assignManualTrackingNumber(id, input);
  }

  @Post("orders/:id/inbound")
  markInbound(@Param("id") id: string) {
    return this.logisticsService.markInbound(id);
  }

  @Post("orders/:id/tracking-events")
  addTrackingEvent(@Param("id") id: string, @Body() input: TrackingEventDto) {
    return this.logisticsService.addManualTrackingEvent(id, input);
  }

  @Post("orders/:id/last-mile")
  createLastMile(@Param("id") id: string) {
    return this.logisticsService.createLastMileOrder(id);
  }

  @Post("orders/:id/last-mile/sync")
  syncLastMile(@Param("id") id: string) {
    return this.logisticsService.syncLastMileTracking(id);
  }

  @Post("orders/:id/cdek/label")
  createCdekLabel(@Param("id") id: string) {
    return this.logisticsService.createCdekLabel(id);
  }

  @Post("orders/:id/cdek/label/refresh")
  refreshCdekLabel(@Param("id") id: string) {
    return this.logisticsService.refreshCdekLabel(id);
  }

  @Post("orders/:id/cdek/tracking/sync")
  syncCdekTracking(@Param("id") id: string) {
    return this.logisticsService.syncCdekTracking(id);
  }
}
