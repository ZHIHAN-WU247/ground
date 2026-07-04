import { AdminRoleGuard } from "./admin-role.guard";
import { Module } from "@nestjs/common";
import { SupabaseTokenGuard } from "./supabase-token.guard";
import { SupabaseTokenService } from "./supabase-token.service";

@Module({
  providers: [AdminRoleGuard, SupabaseTokenGuard, SupabaseTokenService],
  exports: [AdminRoleGuard, SupabaseTokenGuard, SupabaseTokenService]
})
export class AuthModule {}
