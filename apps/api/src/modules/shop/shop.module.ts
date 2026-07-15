import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { LogisticsModule } from "../logistics/logistics.module";
import { AdminShopController } from "./admin-shop.controller";
import { ShopController } from "./shop.controller";
import { ShopOrderLogisticsBridgeService } from "./shop-order-logistics-bridge.service";
import { ShopService } from "./shop.service";
import { ProductImageUploadService } from "./product-image-upload.service";

@Module({
  imports: [AuditLogModule, AuthModule, DatabaseModule, LogisticsModule],
  controllers: [ShopController, AdminShopController],
  providers: [ShopService, ShopOrderLogisticsBridgeService, ProductImageUploadService],
  exports: [ShopService]
})
export class ShopModule {}
