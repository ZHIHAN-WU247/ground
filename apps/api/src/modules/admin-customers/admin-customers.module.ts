import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminCustomersService } from "./admin-customers.service";

@Module({
  imports: [AuditLogModule, AuthModule, DatabaseModule],
  controllers: [AdminCustomersController],
  providers: [AdminCustomersService]
})
export class AdminCustomersModule {}
