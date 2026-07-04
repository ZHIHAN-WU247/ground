import { IsEnum, IsString } from "class-validator";
import type { LogisticsStatus } from "@ground/shared";

export class TrackingEventDto {
  @IsEnum([
    "ACCEPTED",
    "TRANSFER_TO_HUB",
    "DISPATCHED",
    "IN_TRANSIT",
    "ARRIVED_CUSTOMS_WAREHOUSE",
    "CUSTOMS_CLEARANCE",
    "CUSTOMS_RELEASED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "EXCEPTION"
  ])
  status!: LogisticsStatus;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  location!: string;
}
