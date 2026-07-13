import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { CarrierModule } from "../carrier/carrier.module";
import { DatabaseModule } from "../database/database.module";
import { AdminLogisticsController } from "./admin-logistics.controller";
import { LogisticsController } from "./logistics.controller";
import { LogisticsService } from "./logistics.service";

@Module({
  imports: [AuditLogModule, AuthModule, CarrierModule, DatabaseModule],
  controllers: [LogisticsController, AdminLogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService]
})
export class LogisticsModule {}
