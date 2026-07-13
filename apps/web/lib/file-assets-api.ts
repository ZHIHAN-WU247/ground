import type { FileAsset, FileAssetSignedUrl } from "@ground/shared";
import { getAdminJson, getJson, postJson } from "./api";

interface UploadPrivateFileAssetInput {
  ownerEmail: string | undefined;
  file: File;
  purpose: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export async function uploadPrivateFileAsset(input: UploadPrivateFileAssetInput): Promise<FileAsset> {
  if (!input.ownerEmail) {
    throw new Error("Login is required to upload private files.");
  }

  return postJson<FileAsset, Record<string, unknown>>("/file-assets/private", {
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    dataBase64: await readFileAsBase64(input.file),
    purpose: input.purpose,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    metadata: input.metadata ?? {}
  });
}

export async function getPrivateFileAssetSignedUrl(ownerEmail: string | undefined, fileAssetId: string): Promise<FileAssetSignedUrl> {
  if (!ownerEmail) {
    throw new Error("Login is required to view private files.");
  }

  return getJson<FileAssetSignedUrl>(`/file-assets/${encodeURIComponent(fileAssetId)}/signed-url`);
}

export async function getAdminFileAssetSignedUrl(fileAssetId: string): Promise<FileAssetSignedUrl> {
  return getAdminJson<FileAssetSignedUrl>(`/file-assets/admin/${encodeURIComponent(fileAssetId)}/signed-url`);
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
    };
    reader.readAsDataURL(file);
  });
}
