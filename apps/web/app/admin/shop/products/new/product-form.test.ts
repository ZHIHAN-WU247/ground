import assert from "node:assert/strict";
import * as productForm from "./product-form";
import { normalizeProductSlug, validateProductImage } from "./product-form";

const helpers = productForm as typeof productForm & {
  validateDetailSection(section: { body: string; title: string }): string | null;
};

assert.equal(typeof normalizeProductSlug, "function");
assert.equal(normalizeProductSlug(" Linen  Weekender! "), "linen-weekender");
assert.equal(validateProductImage({ size: 2_000_001, type: "image/png" }), "每张图片不能超过 2 MB。");
assert.equal(validateProductImage({ size: 1000, type: "image/gif" }), "仅支持 JPG、PNG 或 WebP 图片。");
assert.equal(validateProductImage({ size: 1000, type: "image/webp" }), null);
assert.equal(helpers.validateDetailSection({ title: "", body: "" }), "请完整填写详情模块的标题和正文。");
assert.equal(helpers.validateDetailSection({ title: "材质", body: "棉质帆布" }), null);
