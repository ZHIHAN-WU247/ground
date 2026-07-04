import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CarrierModule } from "./carrier/carrier.module";
import { HealthController } from "./health.controller";
import { LogisticsModule } from "./logistics/logistics.module";
import { ShopModule } from "./shop/shop.module";

@Module({
  imports: [AuthModule, CarrierModule, LogisticsModule, ShopModule],
  controllers: [HealthController]
})
export class AppModule {}
