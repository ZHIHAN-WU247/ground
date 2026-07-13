import type { ContentBanner } from "@ground/shared";
import { getAdminJson, getJson, postAdminJson } from "./api";

export async function listActiveContentBanners(placement = "home"): Promise<ContentBanner[]> {
  try {
    return await getJson<ContentBanner[]>(`/content/banners?placement=${encodeURIComponent(placement)}`);
  } catch {
    return [];
  }
}

export async function listAdminContentBanners(): Promise<ContentBanner[]> {
  return getAdminJson<ContentBanner[]>("/admin/content/banners");
}

export async function saveAdminContentBanner(banner: Omit<ContentBanner, "createdAt" | "updatedAt">) {
  return postAdminJson<ContentBanner, Omit<ContentBanner, "createdAt" | "updatedAt">>("/admin/content/banners", banner);
}
