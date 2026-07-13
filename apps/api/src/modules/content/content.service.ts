import { Injectable } from "@nestjs/common";
import type { ContentBanner } from "@ground/shared";
import { AuditLogService } from "../audit/audit-log.service";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseBannerStore, type SupabaseBannerClient } from "./supabase-banner-store";

@Injectable()
export class ContentService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly auditLogService: AuditLogService
  ) {}

  listActiveBanners(placement?: string): Promise<ContentBanner[]> {
    return this.getStore().listActiveBanners(placement);
  }

  listAdminBanners(): Promise<ContentBanner[]> {
    return this.getStore().listAdminBanners();
  }

  saveBanner(input: Omit<ContentBanner, "createdAt" | "updatedAt"> & Partial<Pick<ContentBanner, "createdAt" | "updatedAt">>): Promise<ContentBanner> {
    return this.getStore().saveBanner({
      createdAt: "",
      updatedAt: "",
      ...input,
      metadata: input.metadata ?? {}
    });
  }

  async saveBannerWithAudit(
    input: Omit<ContentBanner, "createdAt" | "updatedAt"> & Partial<Pick<ContentBanner, "createdAt" | "updatedAt">>,
    context: { actorUserId?: string; actorEmail?: string; ipAddress?: string; userAgent?: string }
  ): Promise<ContentBanner> {
    const saved = await this.saveBanner(input);
    await this.auditLogService.recordLog({
      ...(context.actorUserId ? { actorUserId: context.actorUserId } : {}),
      ...(context.actorEmail ? { actorEmail: context.actorEmail } : {}),
      action: "content.banner.save",
      entityType: "banner",
      entityId: saved.id,
      beforeData: null,
      afterData: {
        title: saved.title,
        subtitle: saved.subtitle ?? null,
        placement: saved.placement,
        isActive: saved.isActive,
        sortOrder: saved.sortOrder,
        href: saved.href ?? null,
        imageUrl: saved.imageUrl ?? null
      },
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {})
    });
    return saved;
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for content banner persistence.");
    }

    return new SupabaseBannerStore(this.supabaseService.client as unknown as SupabaseBannerClient);
  }
}
