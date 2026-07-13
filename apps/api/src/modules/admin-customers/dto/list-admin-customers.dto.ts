import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import type { AdminCustomerDocumentReviewFilter, AdminCustomerHasOrdersFilter } from "@ground/shared";

export class ListAdminCustomersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["all", "pending", "approved", "rejected", "needs_revision"])
  documentReviewStatus?: AdminCustomerDocumentReviewFilter | "all";

  @IsOptional()
  @IsIn(["all", "true", "false"])
  hasOrders?: AdminCustomerHasOrdersFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
