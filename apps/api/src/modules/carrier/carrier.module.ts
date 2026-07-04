import { Module } from "@nestjs/common";
import { CdekCarrierProvider } from "./cdek-carrier.provider";
import { FixedCarrierProvider } from "./fixed-carrier.provider";

@Module({
  providers: [CdekCarrierProvider, FixedCarrierProvider],
  exports: [CdekCarrierProvider, FixedCarrierProvider]
})
export class CarrierModule {}
