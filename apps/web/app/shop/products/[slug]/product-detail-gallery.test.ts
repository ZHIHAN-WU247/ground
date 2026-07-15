import assert from "node:assert/strict";
import { buildProductDetailGallery } from "./product-detail-gallery";

assert.deepEqual(
  buildProductDetailGallery({
    imageUrl: "https://example.com/cover.webp",
    galleryImageUrls: ["https://example.com/detail-1.webp", "https://example.com/detail-2.webp"]
  }),
  ["https://example.com/cover.webp", "https://example.com/detail-1.webp", "https://example.com/detail-2.webp"]
);

assert.deepEqual(
  buildProductDetailGallery({
    imageUrl: "https://example.com/cover.webp",
    galleryImageUrls: ["https://example.com/cover.webp", "https://example.com/detail-1.webp"]
  }),
  ["https://example.com/cover.webp", "https://example.com/detail-1.webp"]
);
