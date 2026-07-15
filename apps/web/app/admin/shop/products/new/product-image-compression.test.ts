import assert from "node:assert/strict";
import { buildCompressedProductImageName, getProductImageResizeDimensions } from "./product-image-compression";

assert.deepEqual(getProductImageResizeDimensions(3200, 1200), { width: 1600, height: 600 });
assert.deepEqual(getProductImageResizeDimensions(1200, 3200), { width: 600, height: 1600 });
assert.deepEqual(getProductImageResizeDimensions(800, 600), { width: 800, height: 600 });

assert.equal(buildCompressedProductImageName("Cover Image.PNG"), "cover-image.webp");
assert.equal(buildCompressedProductImageName("../标签图"), "product-image.webp");
