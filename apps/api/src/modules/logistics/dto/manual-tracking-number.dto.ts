import { IsString } from "class-validator";

export class ManualTrackingNumberDto {
  @IsString()
  trackingNo!: string;

  @IsString()
  carrierReferenceNo!: string;
}
