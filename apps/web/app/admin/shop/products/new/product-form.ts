const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 2_000_000;
const maxProductSavePayloadBytes = 16_500_000;

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

export function validateProductSavePayload(input: object) {
  const payload = JSON.stringify(input);
  const payloadBytes = new TextEncoder().encode(payload).length;

  if (payloadBytes > maxProductSavePayloadBytes) {
    return "商品图片总大小过大，请减少图片数量或压缩图片后再保存。";
  }

  return null;
}

export function getProductSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "Failed to fetch" || message.includes("NetworkError")) {
    return "商品保存请求未能到达服务器。请确认后端服务正在运行，并减少图片总大小后重试。";
  }

  return message || "商品保存失败，请稍后重试。";
}

export function validateDetailSection(section: { body: string; title: string }) {
  if (!section.title.trim() || !section.body.trim()) {
    return "请完整填写详情模块的标题和正文。";
  }

  return null;
}
