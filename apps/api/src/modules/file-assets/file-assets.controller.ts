import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { UploadPrivateFileAssetDto } from "./dto/upload-private-file-asset.dto";
import { FileAssetsService } from "./file-assets.service";

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller("file-assets")
export class FileAssetsController {
  constructor(private readonly fileAssetsService: FileAssetsService) {}

  @Post("private")
  @UseGuards(SupabaseTokenGuard)
  uploadPrivateAsset(@Req() request: RequestWithUser, @Body() input: UploadPrivateFileAssetDto) {
    return this.fileAssetsService.uploadPrivateAsset(request.user.email, input);
  }

  @Get(":id/signed-url")
  @UseGuards(SupabaseTokenGuard)
  createOwnerSignedUrl(
    @Param("id") id: string,
    @Req() request: RequestWithUser,
    @Query("expiresIn") expiresIn?: string,
    @Query("ownerEmail") _ownerEmail?: string
  ) {
    return this.fileAssetsService.createOwnerSignedUrl(id, request.user.email, Number(expiresIn));
  }

  @Get("admin/:id/signed-url")
  @UseGuards(SupabaseTokenGuard, AdminRoleGuard)
  createAdminSignedUrl(@Param("id") id: string, @Query("expiresIn") expiresIn?: string) {
    return this.fileAssetsService.createAdminSignedUrl(id, Number(expiresIn));
  }
}
