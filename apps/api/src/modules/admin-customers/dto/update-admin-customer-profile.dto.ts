import { IsOptional, IsString } from "class-validator";

export class UpdateAdminCustomerProfileDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

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
