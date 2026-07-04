import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateShopOrderDto } from "./dto/create-shop-order.dto";
import { ShopService } from "./shop.service";

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
  listOrders() {
    return this.shopService.listOrders();
  }

  @Post("orders")
  createOrder(@Body() input: CreateShopOrderDto) {
    return this.shopService.createOrder(input);
  }
}
