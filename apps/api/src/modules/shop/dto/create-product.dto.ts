import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import type { CreateProductInput, CurrencyCode, ProductCategorySlug } from "@ground/shared";

const imageDataUrlPattern = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\r\n]+$/i;
const imageUrlPattern = /^(?:https?:\/\/\S+|data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\r\n]+)$/i;

class CreateProductSkuDto {
  @IsString()
  @Length(1, 80)
  model: string;

  @IsString()
  @Length(1, 80)
  size: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999)
  price: number;

  @IsIn(["CNY", "USD", "RUB"] satisfies CurrencyCode[])
  currency: CurrencyCode;

  @IsString()
  @Length(1, 80)
  stockLabel: string;
}

class ProductDetailSectionDto {
  @IsString()
  @Length(1, 120)
  title: string;

  @IsString()
  @Length(1, 5000)
  body: string;

  @IsOptional()
  @Matches(imageUrlPattern)
  @MaxLength(2_800_000)
  imageUrl?: string;
}

export class CreateProductDto implements CreateProductInput {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(2, 80)
  slug: string;

  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 240)
  summary: string;

  @IsString()
  @Length(1, 4000)
  description: string;

  @Matches(imageUrlPattern)
  @MaxLength(2_800_000)
  imageUrl: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Matches(imageUrlPattern, { each: true })
  @MaxLength(2_800_000, { each: true })
  galleryImageUrls?: string[];

  @IsBoolean()
  isPublished: boolean;

  @IsIn(["daily", "tops", "pants", "shoes", "accessories"] satisfies ProductCategorySlug[])
  categorySlug: ProductCategorySlug;

  @IsString()
  @Length(1, 40)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  salesLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  originLabel?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductDetailSectionDto)
  detailSections?: ProductDetailSectionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateProductSkuDto)
  skus: CreateProductSkuDto[];
}

export class UpdateProductStatusDto {
  @IsBoolean()
  isPublished: boolean;
}
