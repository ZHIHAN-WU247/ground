import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({
  imports: [AuditLogModule, AuthModule, DatabaseModule],
  controllers: [ContentController],
  providers: [ContentService]
})
export class ContentModule {}
