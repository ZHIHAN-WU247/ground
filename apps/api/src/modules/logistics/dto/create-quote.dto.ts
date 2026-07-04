import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import type { CargoType, CurrencyCode, LogisticsDeliveryMethod, SupportedDestinationCountry } from "@ground/shared";

export class CreateQuoteDto {
  @IsEnum(["B2B", "B2C"])
  cargoType!: CargoType;

  @IsEnum(["Russia", "Kazakhstan", "Belarus"])
  destinationCountry!: SupportedDestinationCountry;

  @IsString()
  destinationCity!: string;

  @IsOptional()
  @IsEnum(["TO_DOOR", "TO_WAREHOUSE"])
  deliveryMethod?: LogisticsDeliveryMethod;

  @IsEnum(["CNY", "USD", "RUB"])
  currency!: CurrencyCode;

  @IsNumber()
  @IsPositive()
  weightKg!: number;

  @IsNumber()
  @IsPositive()
  lengthCm!: number;

  @IsNumber()
  @IsPositive()
  widthCm!: number;

  @IsNumber()
  @IsPositive()
  heightCm!: number;

  @IsInt()
  @IsPositive()
  packageCount!: number;

  @IsOptional()
  @IsString()
  destinationPostalCode?: string;

  @IsOptional()
  @IsString()
  destinationAddressLine?: string;

  @IsOptional()
  @IsString()
  destinationLocationCode?: string;

  @IsOptional()
  @IsString()
  destinationFiasGuid?: string;
}
