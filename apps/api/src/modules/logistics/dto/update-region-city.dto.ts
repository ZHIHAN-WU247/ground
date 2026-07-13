import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateRegionCityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  postalCodeHint?: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsOptional()
  @IsString()
  fiasGuid?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
