import { ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ShopOrderItemDto {
  @IsString()
  productId!: string;

  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class ShopRecipientDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  email!: string;

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
}

export class CreateShopOrderDto {
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShopOrderItemDto)
  items!: ShopOrderItemDto[];

  @ValidateNested()
  @Type(() => ShopRecipientDto)
  recipient!: ShopRecipientDto;
}
