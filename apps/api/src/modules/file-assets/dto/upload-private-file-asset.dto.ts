import { IsEmail, IsObject, IsOptional, IsString } from "class-validator";

export class UploadPrivateFileAssetDto {
  @IsEmail()
  ownerEmail!: string;

  @IsString()
  fileName!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsString()
  dataBase64!: string;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
