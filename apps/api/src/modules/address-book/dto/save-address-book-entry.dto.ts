import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { AddressBookKind } from "../address-book.types";

class AddressBookEntryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  label!: string;

  @IsEnum(["sender", "recipient"])
  kind!: AddressBookKind;

  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}

export class SaveAddressBookEntryDto {
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @ValidateNested()
  @Type(() => AddressBookEntryDto)
  entry!: AddressBookEntryDto;
}
