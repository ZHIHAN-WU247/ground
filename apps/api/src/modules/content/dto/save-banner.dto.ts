import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class SaveBannerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  imageFileAssetId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  href?: string;

  @IsString()
  placement!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsNumber()
  sortOrder!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
