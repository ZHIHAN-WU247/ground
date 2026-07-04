import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseTokenService } from "./supabase-token.service";

interface RequestWithUser {
  headers: {
    authorization?: string;
    "x-ground-dev-admin"?: string;
    "x-ground-dev-admin-email"?: string;
  };
  user?: Awaited<ReturnType<SupabaseTokenService["verifyAuthorizationHeader"]>>;
}

@Injectable()
export class SupabaseTokenGuard implements CanActivate {
  constructor(private readonly tokenService: SupabaseTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    try {
      request.user = await this.tokenService.verifyRequestHeaders(request.headers);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Unable to verify Supabase Auth token.");
    }
  }
}
