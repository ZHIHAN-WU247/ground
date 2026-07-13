import { buildLoginRedirectPath } from "../../../lib/auth-redirect";

export function getLogisticsOrderDetailLoginHref(id: string) {
  return buildLoginRedirectPath(`/logistics/orders/${encodeURIComponent(id)}`);
}

export function hasLogisticsOrderDetailIdentity(profile: { email?: string } | null, accessToken: string) {
  return Boolean(profile?.email?.trim() && accessToken.trim());
}
