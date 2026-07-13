import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import type { CurrencyCode, LogisticsDeliveryMethod, LogisticsPricingFormula } from "@ground/shared";

export class UpdatePricingRouteConfigDto {
  @IsOptional()
  @IsEnum(["TO_DOOR", "TO_WAREHOUSE"])
  deliveryMethod?: LogisticsDeliveryMethod;

  @IsOptional()
  @IsString()
  labelKey?: string;

  @IsOptional()
  @IsString()
  noteKey?: string;

  @IsOptional()
  @IsEnum(["CNY", "USD", "RUB"])
  currency?: CurrencyCode;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(["half_kg_step", "cdek_first_last_mile", "per_kg"])
  formula?: LogisticsPricingFormula;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  halfKgUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stepAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  firstMileCnyPerKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perKgAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  rubPerCny?: number;
}
