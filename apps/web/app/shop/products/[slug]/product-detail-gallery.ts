import type { Product } from "@ground/shared";

export function buildProductDetailGallery(product: Pick<Product, "galleryImageUrls" | "imageUrl">): string[] {
  return Array.from(new Set([product.imageUrl, ...(product.galleryImageUrls ?? [])].filter(Boolean)));
}
