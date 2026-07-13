import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { CustomerDocumentsController } from "./customer-documents.controller";
import { CustomerDocumentsService } from "./customer-documents.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CustomerDocumentsController],
  providers: [CustomerDocumentsService]
})
export class CustomerDocumentsModule {}
