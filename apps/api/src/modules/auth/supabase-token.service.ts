import { Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify } from "jose";
import { getLocalAdminEmails } from "./local-admin-access";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "customer" | "admin";
}

interface HeaderBag {
  authorization?: string;
  "x-ground-dev-admin"?: string;
  "x-ground-dev-admin-email"?: string;
}

@Injectable()
export class SupabaseTokenService {
  async verifyRequestHeaders(headers: HeaderBag): Promise<AuthenticatedUser> {
    if (headers.authorization?.startsWith("Bearer ")) {
      return this.verifyAuthorizationHeader(headers.authorization);
    }

    return this.verifyLocalAdminHeaders(headers);
  }

  async verifyAuthorizationHeader(header: string | undefined): Promise<AuthenticatedUser> {
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Supabase Auth bearer token.");
    }

    const token = header.slice("Bearer ".length);
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      throw new UnauthorizedException("Supabase JWT secret is not configured.");
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const appMetadata = this.getObjectPayload(payload.app_metadata);
    const role = appMetadata.role === "admin" ? "admin" : "customer";

    if (!userId || !email) {
      throw new UnauthorizedException("Invalid Supabase Auth token payload.");
    }

    return { id: userId, email, role };
  }

  private verifyLocalAdminHeaders(headers: HeaderBag): AuthenticatedUser {
    const devAdminEnabled = headers["x-ground-dev-admin"] === "true";
    const email = headers["x-ground-dev-admin-email"]?.trim().toLowerCase() ?? "";
    const allowedEmails = this.getLocalAdminEmails();

    if (!devAdminEnabled || !email || !allowedEmails.includes(email)) {
      throw new UnauthorizedException("Missing Supabase Auth bearer token.");
    }

    return {
      id: `local-admin-${email}`,
      email,
      role: "admin"
    };
  }

  private getLocalAdminEmails() {
    return getLocalAdminEmails();
  }

  private getObjectPayload(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }
}
