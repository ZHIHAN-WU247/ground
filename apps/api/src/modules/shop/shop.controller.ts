import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { CreateShopOrderDto } from "./dto/create-shop-order.dto";
import { ShopService } from "./shop.service";

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller("shop")
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get("products")
  listProducts() {
    return this.shopService.listProducts();
  }

  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.shopService.getProduct(slug);
  }

  @Get("orders")
  @UseGuards(SupabaseTokenGuard)
  listOrders(@Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    return this.shopService.listOrders(request.user.email);
  }

  @Get("orders/:id")
  @UseGuards(SupabaseTokenGuard)
  getOrder(@Param("id") id: string, @Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    return this.shopService.getOrder(id, request.user.email);
  }

  @Post("orders")
  @UseGuards(SupabaseTokenGuard)
  createOrder(@Req() request: RequestWithUser, @Body() input: CreateShopOrderDto) {
    return this.shopService.createOrder({ ...input, ownerEmail: request.user.email });
  }
}
