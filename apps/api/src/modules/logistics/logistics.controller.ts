import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { LogisticsQuoteRequest } from "@ground/shared";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { CreateLogisticsOrderDto } from "./dto/create-logistics-order.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { LogisticsService } from "./logistics.service";

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller("logistics")
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post("quotes")
  createQuote(@Body() input: CreateQuoteDto) {
    return this.logisticsService.createQuote(input as LogisticsQuoteRequest);
  }

  @Get("pricing/routes")
  listPricingRouteConfigs() {
    return this.logisticsService.listPricingRouteConfigs();
  }

  @Get("regions")
  listRegionConfigs() {
    return this.logisticsService.listRegionConfigs();
  }

  @Post("orders")
  @UseGuards(SupabaseTokenGuard)
  createOrder(@Req() request: RequestWithUser, @Body() input: CreateLogisticsOrderDto) {
    return this.logisticsService.createOrder({ ...input, ownerEmail: request.user.email });
  }

  @Get("orders")
  @UseGuards(SupabaseTokenGuard)
  listOrders(@Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    return this.logisticsService.listOrders(request.user.email);
  }

  @Get("orders/:id")
  @UseGuards(SupabaseTokenGuard)
  getOrder(@Param("id") id: string, @Req() request: RequestWithUser) {
    return this.logisticsService.getOrder(id, request.user.email);
  }

  @Get("tracking/:trackingNo")
  getTracking(@Param("trackingNo") trackingNo: string) {
    return this.logisticsService.getOrder(trackingNo);
  }
}
