import { postAdminFormData } from "./api";

interface ProductImageUploadResult {
  url: string;
}

export async function uploadProductImage(file: File): Promise<ProductImageUploadResult> {
  const body = new FormData();
  body.set("file", file, file.name);
  return postAdminFormData<ProductImageUploadResult>("/admin/shop/product-images", body);
}
