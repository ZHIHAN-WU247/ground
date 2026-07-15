const maxImageDimension = 1600;
const webpQuality = 0.8;

export function getProductImageResizeDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    throw new Error("图片尺寸无效，请重新选择图片。");
  }

  const longestSide = Math.max(width, height);

  if (longestSide <= maxImageDimension) {
    return { width, height };
  }

  const scale = maxImageDimension / longestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

export function buildCompressedProductImageName(fileName: string) {
  const baseName = fileName
    .split(/[\\/]/)
    .pop()
    ?.trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseName || "product-image"}.webp`;
}

export async function compressProductImageToWebp(file: File): Promise<File> {
  const image = await loadImage(file);
  const size = getProductImageResizeDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("图片压缩失败，请更换浏览器或重试。");
  }

  context.drawImage(image, 0, 0, size.width, size.height);
  const blob = await canvasToWebpBlob(canvas);
  return new File([blob], buildCompressedProductImageName(file.name), {
    type: "image/webp",
    lastModified: Date.now()
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败，请重新选择。"));
    };
    image.src = objectUrl;
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败，请重新选择。"));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      webpQuality
    );
  });
}
