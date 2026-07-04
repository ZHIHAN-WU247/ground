import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class ReviewOrderDto {
  @IsEnum(["APPROVE", "REJECT"])
  decision!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  correctedWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  correctedLengthCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  correctedWidthCm?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  correctedHeightCm?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cdekTariffCode?: number;
}
