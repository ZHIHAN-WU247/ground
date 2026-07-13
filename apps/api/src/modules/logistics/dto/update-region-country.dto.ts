import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateRegionCountryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
