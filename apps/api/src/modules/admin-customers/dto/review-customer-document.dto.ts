import { IsIn, IsOptional, IsString } from "class-validator";
import type { CustomerDocumentReviewStatus } from "@ground/shared";

export class ReviewCustomerDocumentDto {
  @IsIn(["approved", "rejected", "needs_revision"])
  status!: CustomerDocumentReviewStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
