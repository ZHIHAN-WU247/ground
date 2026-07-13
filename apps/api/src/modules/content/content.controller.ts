import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { ContentService } from "./content.service";
import { SaveBannerDto } from "./dto/save-banner.dto";

interface RequestWithUser {
  user?: AuthenticatedUser;
  ip?: string;
  headers: {
    "user-agent"?: string;
  };
}

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("content/banners")
  listActiveBanners(@Query("placement") placement?: string) {
    return this.contentService.listActiveBanners(placement);
  }

  @Get("admin/content/banners")
  @UseGuards(SupabaseTokenGuard, AdminRoleGuard)
  listAdminBanners() {
    return this.contentService.listAdminBanners();
  }

  @Post("admin/content/banners")
  @UseGuards(SupabaseTokenGuard, AdminRoleGuard)
  saveBanner(@Body() input: SaveBannerDto, @Req() request: RequestWithUser) {
    return this.contentService.saveBannerWithAudit(
      {
        id: input.id ?? "",
        title: input.title,
        ...(input.subtitle ? { subtitle: input.subtitle } : {}),
        ...(input.imageFileAssetId ? { imageFileAssetId: input.imageFileAssetId } : {}),
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        ...(input.href ? { href: input.href } : {}),
        placement: input.placement,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        metadata: input.metadata ?? {}
      },
      {
        ...(request.user?.id ? { actorUserId: request.user.id } : {}),
        ...(request.user?.email ? { actorEmail: request.user.email } : {}),
        ...(request.ip ? { ipAddress: request.ip } : {}),
        ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
      }
    );
  }
}
