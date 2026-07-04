import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { LogisticsQuoteRequest } from "@ground/shared";
import { CreateLogisticsOrderDto } from "./dto/create-logistics-order.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { LogisticsService } from "./logistics.service";

@Controller("logistics")
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post("quotes")
  createQuote(@Body() input: CreateQuoteDto) {
    return this.logisticsService.createQuote(input as LogisticsQuoteRequest);
  }

  @Post("orders")
  createOrder(@Body() input: CreateLogisticsOrderDto) {
    return this.logisticsService.createOrder(input);
  }

  @Get("orders")
  listOrders() {
    return this.logisticsService.listOrders();
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.logisticsService.getOrder(id);
  }

  @Get("tracking/:trackingNo")
  getTracking(@Param("trackingNo") trackingNo: string) {
    return this.logisticsService.getOrder(trackingNo);
  }
}
