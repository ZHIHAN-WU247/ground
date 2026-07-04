import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CarrierModule } from "../carrier/carrier.module";
import { AdminLogisticsController } from "./admin-logistics.controller";
import { LogisticsController } from "./logistics.controller";
import { LogisticsService } from "./logistics.service";

@Module({
  imports: [AuthModule, CarrierModule],
  controllers: [LogisticsController, AdminLogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService]
})
export class LogisticsModule {}
