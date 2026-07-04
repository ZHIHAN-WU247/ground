import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LogisticsModule } from "../logistics/logistics.module";
import { AdminShopController } from "./admin-shop.controller";
import { ShopController } from "./shop.controller";
import { ShopOrderLogisticsBridgeService } from "./shop-order-logistics-bridge.service";
import { ShopService } from "./shop.service";

@Module({
  imports: [AuthModule, LogisticsModule],
  controllers: [ShopController, AdminShopController],
  providers: [ShopService, ShopOrderLogisticsBridgeService],
  exports: [ShopService]
})
export class ShopModule {}
