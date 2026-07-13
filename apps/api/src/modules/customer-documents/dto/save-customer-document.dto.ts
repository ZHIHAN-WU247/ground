import { IsObject, IsOptional, IsString } from "class-validator";

export class SaveCustomerDocumentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  documentType!: string;

  @IsString()
  documentNo!: string;

  @IsOptional()
  @IsString()
  fileAssetId?: string;

  @IsOptional()
  @IsString()
  verifiedAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
