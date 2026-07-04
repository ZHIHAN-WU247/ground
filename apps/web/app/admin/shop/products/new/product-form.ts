const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 2_000_000;

export function normalizeProductSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateProductImage(file: { size: number; type: string }) {
  if (!supportedImageTypes.has(file.type)) {
    return "仅支持 JPG、PNG 或 WebP 图片。";
  }

  if (file.size > maxImageBytes) {
    return "每张图片不能超过 2 MB。";
  }

  return null;
}

export function validateDetailSection(section: { body: string; title: string }) {
  if (!section.title.trim() || !section.body.trim()) {
    return "请完整填写详情模块的标题和正文。";
  }

  return null;
}
