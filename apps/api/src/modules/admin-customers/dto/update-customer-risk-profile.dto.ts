import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import type { AdminCustomerRiskLevel } from "@ground/shared";

export class UpdateCustomerRiskProfileDto {
  @IsString()
  adminNote!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsIn(["low", "medium", "high"])
  riskLevel!: AdminCustomerRiskLevel;

  @IsBoolean()
  isBlacklisted!: boolean;

  @IsString()
  restrictionReason!: string;

  @IsOptional()
  @IsString()
  followUpAt?: string;
}
