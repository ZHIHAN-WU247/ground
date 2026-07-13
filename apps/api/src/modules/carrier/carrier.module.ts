import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CarrierConfigService } from "./carrier-config.service";
import { CdekCarrierProvider } from "./cdek-carrier.provider";
import { FixedCarrierProvider } from "./fixed-carrier.provider";

@Module({
  imports: [DatabaseModule],
  providers: [CarrierConfigService, CdekCarrierProvider, FixedCarrierProvider],
  exports: [CarrierConfigService, CdekCarrierProvider, FixedCarrierProvider]
})
export class CarrierModule {}
