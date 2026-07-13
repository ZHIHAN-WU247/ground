import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
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
  "x-ground-dev-customer-email"?: string;
}

@Injectable()
export class SupabaseTokenService {
  private jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

  async verifyRequestHeaders(headers: HeaderBag): Promise<AuthenticatedUser> {
    if (headers.authorization?.startsWith("Bearer ")) {
      try {
        return await this.verifyAuthorizationHeader(headers.authorization);
      } catch (error) {
        const localAdmin = this.verifyLocalAdminHeaders(headers);
        if (localAdmin) {
          return localAdmin;
        }

        const localCustomer = this.verifyLocalCustomerHeaders(headers);

        if (localCustomer) {
          return localCustomer;
        }

        throw error;
      }
    }

    const localCustomer = this.verifyLocalCustomerHeaders(headers);
    if (localCustomer) {
      return localCustomer;
    }

    const localAdmin = this.verifyLocalAdminHeaders(headers);

    if (localAdmin) {
      return localAdmin;
    }

    throw new UnauthorizedException("Missing Supabase Auth bearer token.");
  }

  async verifyAuthorizationHeader(header: string | undefined): Promise<AuthenticatedUser> {
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Supabase Auth bearer token.");
    }

    const token = header.slice("Bearer ".length);
    const { payload } = await this.verifyToken(token);
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const appMetadata = this.getObjectPayload(payload.app_metadata);
    const role = appMetadata.role === "admin" ? "admin" : "customer";

    if (!userId || !email) {
      throw new UnauthorizedException("Invalid Supabase Auth token payload.");
    }

    return { id: userId, email, role };
  }

  private verifyLocalAdminHeaders(headers: HeaderBag): AuthenticatedUser | null {
    const devAdminEnabled = headers["x-ground-dev-admin"] === "true";
    const email = headers["x-ground-dev-admin-email"]?.trim().toLowerCase() ?? "";
    const allowedEmails = this.getLocalAdminEmails();

    if (!devAdminEnabled || !email) {
      return null;
    }

    if (!allowedEmails.includes(email) && !this.isLocalAdminHeaderTrustEnabled()) {
      return null;
    }

    return {
      id: `local-admin-${email}`,
      email,
      role: "admin"
    };
  }

  private verifyLocalCustomerHeaders(headers: HeaderBag): AuthenticatedUser | null {
    if (!this.isLocalCustomerAuthEnabled()) {
      return null;
    }

    const email = headers["x-ground-dev-customer-email"]?.trim().toLowerCase() ?? "";

    if (!email) {
      return null;
    }

    return {
      id: `local-customer-${email}`,
      email,
      role: "customer"
    };
  }

  private isLocalCustomerAuthEnabled() {
    return process.env.NODE_ENV !== "production" || process.env.GROUND_ENABLE_LOCAL_CUSTOMER_AUTH === "true";
  }

  private getLocalAdminEmails() {
    return getLocalAdminEmails();
  }

  private isLocalAdminHeaderTrustEnabled() {
    return process.env.NODE_ENV !== "production";
  }

  private async verifyToken(token: string): Promise<{ payload: JWTPayload }> {
    const header = decodeProtectedHeader(token);

    if (header.alg === "HS256") {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;

      if (!jwtSecret) {
        throw new UnauthorizedException("Supabase JWT secret is not configured.");
      }

      return jwtVerify(token, new TextEncoder().encode(jwtSecret));
    }

    return jwtVerify(token, this.getJwks());
  }

  private getJwks() {
    if (this.jwks) {
      return this.jwks;
    }

    const supabaseUrl = process.env.SUPABASE_URL?.trim();

    if (!supabaseUrl) {
      throw new UnauthorizedException("Supabase URL is not configured.");
    }

    this.jwks = createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", supabaseUrl));
    return this.jwks;
  }

  private getObjectPayload(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }
}
