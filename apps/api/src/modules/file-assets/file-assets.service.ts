import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { FileAsset, FileAssetSignedUrl } from "@ground/shared";
import { SupabaseService } from "../database/supabase.service";
import { SupabaseFileAssetStore, type SupabaseFileAssetClient, type UploadPrivateAssetInput } from "./supabase-file-asset-store";

@Injectable()
export class FileAssetsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadPrivateAsset(ownerEmail: string, input: UploadPrivateAssetInput): Promise<FileAsset> {
    return this.getStore().uploadPrivateAsset(ownerEmail, input);
  }

  async createOwnerSignedUrl(id: string, ownerEmail: string | undefined, expiresIn?: number): Promise<FileAssetSignedUrl> {
    const asset = await this.getStore().getAsset(id);
    if (!asset) {
      throw new NotFoundException("File asset was not found.");
    }

    const normalizedOwner = ownerEmail?.trim().toLowerCase() ?? "";

    if (!normalizedOwner || asset.ownerEmail?.toLowerCase() !== normalizedOwner) {
      throw new ForbiddenException("You do not have access to this private file.");
    }

    return this.getStore().createSignedUrlForAsset(id, this.normalizeExpiresIn(expiresIn));
  }

  async createAdminSignedUrl(id: string, expiresIn?: number): Promise<FileAssetSignedUrl> {
    return this.getStore().createSignedUrlForAsset(id, this.normalizeExpiresIn(expiresIn));
  }

  private normalizeExpiresIn(expiresIn?: number) {
    if (!Number.isFinite(expiresIn) || !expiresIn) {
      return 300;
    }

    return Math.min(Math.max(Math.floor(expiresIn), 60), 3600);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for private file uploads.");
    }

    return new SupabaseFileAssetStore(this.supabaseService.client as unknown as SupabaseFileAssetClient);
  }
}
