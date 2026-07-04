import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "./supabase-token.service";

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new UnauthorizedException("Missing authenticated admin user.");
    }

    if (request.user.role !== "admin") {
      throw new ForbiddenException("Admin access is required.");
    }

    return true;
  }
}
