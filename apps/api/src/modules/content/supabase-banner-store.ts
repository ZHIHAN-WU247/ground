import type { ContentBanner } from "@ground/shared";

interface SupabaseResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface SupabaseQuery<T> extends PromiseLike<SupabaseResult<T>> {
  select(columns?: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  eq(column: string, value: string | boolean): SupabaseQuery<T>;
  insert(payload: Record<string, unknown>): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<T>;
  single(): Promise<SupabaseResult<T>>;
  maybeSingle(): Promise<SupabaseResult<T>>;
}

export interface SupabaseBannerClient {
  from<T = unknown>(table: string): SupabaseQuery<T>;
}

interface BannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  image_file_asset_id: string | null;
  image_url: string | null;
  href: string | null;
  placement: string;
  is_active: boolean;
  sort_order: number;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

export class SupabaseBannerStore {
  constructor(private readonly client: SupabaseBannerClient) {}

  async listActiveBanners(placement = "home"): Promise<ContentBanner[]> {
    const result = await this.client
      .from<BannerRow[]>("banners")
      .select("*")
      .eq("placement", placement)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    this.assertSuccess(result, "Failed to load active banners from Supabase.");
    return (result.data ?? []).map((row) => this.toBanner(row));
  }

  async listAdminBanners(): Promise<ContentBanner[]> {
    const result = await this.client
      .from<BannerRow[]>("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    this.assertSuccess(result, "Failed to load admin banners from Supabase.");
    return (result.data ?? []).map((row) => this.toBanner(row));
  }

  async saveBanner(banner: ContentBanner): Promise<ContentBanner> {
    const normalized = this.normalizeBanner(banner);

    if (this.isUuid(normalized.id)) {
      const updateResult = await this.client
        .from<BannerRow>("banners")
        .update(this.toRowPayload(normalized))
        .eq("id", normalized.id)
        .select()
        .maybeSingle();
      this.assertSuccess(updateResult, "Failed to update banner in Supabase.");

      if (updateResult.data) {
        return this.toBanner(updateResult.data);
      }
    }

    const insertResult = await this.client
      .from<BannerRow>("banners")
      .insert(this.toRowPayload({ ...normalized, id: "" }))
      .select()
      .single();
    this.assertSuccess(insertResult, "Failed to create banner in Supabase.");
    return this.toBanner(insertResult.data!);
  }

  private toRowPayload(banner: ContentBanner) {
    return {
      title: banner.title,
      subtitle: banner.subtitle ?? null,
      image_file_asset_id: banner.imageFileAssetId ?? null,
      image_url: banner.imageUrl ?? null,
      href: banner.href ?? null,
      placement: banner.placement,
      is_active: banner.isActive,
      sort_order: banner.sortOrder,
      metadata: banner.metadata
    };
  }

  private toBanner(row: BannerRow): ContentBanner {
    return {
      id: row.id,
      title: row.title,
      ...(row.subtitle ? { subtitle: row.subtitle } : {}),
      ...(row.image_file_asset_id ? { imageFileAssetId: row.image_file_asset_id } : {}),
      ...(row.image_url ? { imageUrl: row.image_url } : {}),
      ...(row.href ? { href: row.href } : {}),
      placement: row.placement,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      metadata: this.metadataObject(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private normalizeBanner(banner: ContentBanner): ContentBanner {
    return {
      id: banner.id?.trim() ?? "",
      title: banner.title.trim(),
      ...(banner.subtitle?.trim() ? { subtitle: banner.subtitle.trim() } : {}),
      ...(banner.imageFileAssetId?.trim() ? { imageFileAssetId: banner.imageFileAssetId.trim() } : {}),
      ...(banner.imageUrl?.trim() ? { imageUrl: banner.imageUrl.trim() } : {}),
      ...(banner.href?.trim() ? { href: banner.href.trim() } : {}),
      placement: banner.placement.trim() || "home",
      isActive: banner.isActive,
      sortOrder: Number.isFinite(banner.sortOrder) ? banner.sortOrder : 0,
      metadata: this.metadataObject(banner.metadata),
      createdAt: banner.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private metadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private assertSuccess<T>(result: SupabaseResult<T>, fallback: string): asserts result is SupabaseResult<T> & { error: null } {
    if (result.error) {
      throw new Error(result.error.message || fallback);
    }
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
