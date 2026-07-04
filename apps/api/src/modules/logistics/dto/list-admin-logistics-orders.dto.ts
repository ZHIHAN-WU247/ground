import { IsEnum, IsOptional } from "class-validator";
import type { LogisticsStatusGroup } from "@ground/shared";

export class ListAdminLogisticsOrdersDto {
  @IsOptional()
  @IsEnum(["ALL", "REVIEW_QUEUE", "PENDING_SHIPMENT", "INTERNATIONAL_TRANSIT", "LAST_MILE", "COMPLETED", "ATTENTION"])
  statusGroup?: LogisticsStatusGroup;
}
