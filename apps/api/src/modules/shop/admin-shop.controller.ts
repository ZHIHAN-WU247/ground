import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { Product } from "@ground/shared";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { CreateProductDto, UpdateProductStatusDto } from "./dto/create-product.dto";
import { CreateShopLogisticsOrderDto } from "./dto/create-shop-logistics-order.dto";
import { UpdateShopOrderStatusDto } from "./dto/update-shop-order-status.dto";
import { ShopOrderLogisticsBridgeService } from "./shop-order-logistics-bridge.service";
import { ShopService } from "./shop.service";

@Controller("admin/shop")
@UseGuards(SupabaseTokenGuard, AdminRoleGuard)
export class AdminShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly shopOrderLogisticsBridgeService: ShopOrderLogisticsBridgeService
  ) {}

  @Get("products")
  listProducts(): Product[] {
    return this.shopService.listAdminProducts();
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string): Product {
    return this.shopService.getAdminProduct(id);
  }

  @Post("products")
  createProduct(@Body() input: CreateProductDto): Product {
    return this.shopService.createProduct({
      ...input,
      galleryImageUrls: input.galleryImageUrls ?? []
    });
  }

  @Patch("products/:id")
  updateProduct(@Param("id") id: string, @Body() input: CreateProductDto): Product {
    return this.shopService.updateProduct(id, {
      ...input,
      galleryImageUrls: input.galleryImageUrls ?? []
    });
  }

  @Patch("products/:id/status")
  updateProductStatus(@Param("id") id: string, @Body() input: UpdateProductStatusDto): Product {
    return this.shopService.setProductPublished(id, input.isPublished);
  }

  @Delete("products/:id")
  deleteProduct(@Param("id") id: string): Product {
    return this.shopService.deleteProduct(id);
  }

  @Get("orders")
  listOrders() {
    return this.shopService.listAdminOrders();
  }

  @Get("orders/logistics-handoffs")
  listLogisticsHandoffs() {
    return this.shopService.listLogisticsHandoffs();
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.shopService.getAdminOrder(id);
  }

  @Patch("orders/:id/status")
  updateOrderStatus(@Param("id") id: string, @Body() input: UpdateShopOrderStatusDto) {
    return this.shopService.updateOrderStatus(id, input.status);
  }

  @Post("orders/:id/logistics")
  submitOrderToLogistics(@Param("id") id: string, @Body() input: CreateShopLogisticsOrderDto) {
    return this.shopOrderLogisticsBridgeService.submit(id, input);
  }
}
