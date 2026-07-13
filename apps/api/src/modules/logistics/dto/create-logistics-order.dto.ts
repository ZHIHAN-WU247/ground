import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { CargoType, CurrencyCode, LogisticsDeliveryMethod, LogisticsRouteId } from "@ground/shared";

class AddressContactDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  country!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  postalCode!: string;

  @IsString()
  addressLine!: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsOptional()
  @IsString()
  fiasGuid?: string;
}

class CargoItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  @IsPositive()
  unitValueCny!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateLogisticsOrderDto {
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsEnum(["B2B", "B2C"])
  cargoType!: CargoType;

  @IsOptional()
  @IsEnum(["air-ems", "air-cdek", "land-cdek", "land-russia-post"])
  routeId?: LogisticsRouteId;

  @IsOptional()
  @IsEnum(["TO_DOOR", "TO_WAREHOUSE"])
  deliveryMethod?: LogisticsDeliveryMethod;

  @ValidateNested()
  @Type(() => AddressContactDto)
  sender!: AddressContactDto;

  @ValidateNested()
  @Type(() => AddressContactDto)
  recipient!: AddressContactDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CargoItemDto)
  cargoItems?: CargoItemDto[];

  @IsOptional()
  @IsString()
  goodsName?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  declaredValue?: number;

  @IsOptional()
  @IsEnum(["CNY", "USD"])
  declaredCurrency?: CurrencyCode;

  @IsOptional()
  @IsString()
  taxIdOrDocumentNo?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lengthCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  widthCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  heightCm?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  packageCount?: number;
}
