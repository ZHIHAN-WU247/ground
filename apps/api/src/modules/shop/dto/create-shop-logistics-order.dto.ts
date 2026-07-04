import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested
} from "class-validator";
import type { LogisticsRouteId } from "@ground/shared";

class ShopLogisticsSenderDto {
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

class ShopOrderItemDeclaredValueDto {
  @IsString()
  productId!: string;

  @IsString()
  skuId!: string;

  @IsNumber()
  @IsPositive()
  unitValueCny!: number;
}

export class CreateShopLogisticsOrderDto {
  @IsEnum(["air-ems", "air-cdek", "land-cdek", "land-russia-post"])
  routeId!: LogisticsRouteId;

  @ValidateNested()
  @Type(() => ShopLogisticsSenderDto)
  sender!: ShopLogisticsSenderDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShopOrderItemDeclaredValueDto)
  itemDeclaredValues!: ShopOrderItemDeclaredValueDto[];

  @IsString()
  taxIdOrDocumentNo!: string;

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
}
