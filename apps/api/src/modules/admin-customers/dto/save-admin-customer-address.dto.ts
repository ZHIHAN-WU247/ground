import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import type { AdminCustomerAddressKind } from "@ground/shared";

export class SaveAdminCustomerAddressDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  label!: string;

  @IsEnum(["sender", "recipient"])
  kind!: AdminCustomerAddressKind;

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

  @IsBoolean()
  isDefault!: boolean;
}
