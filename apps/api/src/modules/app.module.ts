import { Module } from "@nestjs/common";
import { AddressBookModule } from "./address-book/address-book.module";
import { AdminCustomersModule } from "./admin-customers/admin-customers.module";
import { AuditLogModule } from "./audit/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { CarrierModule } from "./carrier/carrier.module";
import { ContentModule } from "./content/content.module";
import { CustomerDocumentsModule } from "./customer-documents/customer-documents.module";
import { FileAssetsModule } from "./file-assets/file-assets.module";
import { HealthController } from "./health.controller";
import { LogisticsModule } from "./logistics/logistics.module";
import { ShopModule } from "./shop/shop.module";
import { UserProfileModule } from "./user-profile/user-profile.module";

@Module({
  imports: [AddressBookModule, AdminCustomersModule, AuditLogModule, AuthModule, CarrierModule, ContentModule, CustomerDocumentsModule, FileAssetsModule, LogisticsModule, ShopModule, UserProfileModule],
  controllers: [HealthController]
})
export class AppModule {}
