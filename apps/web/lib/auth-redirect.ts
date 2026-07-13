const DEFAULT_AUTH_RETURN_PATH = "/account/profile";
const DEFAULT_ADMIN_RETURN_PATH = "/admin";

export const buildLoginRedirectPath = (returnPath: string) => `/auth/login?next=${encodeURIComponent(getSafeReturnPath(returnPath))}`;

export const getSafeAuthReturnPath = (search: string) => {
  const next = new URLSearchParams(search).get("next") ?? "";
  return getSafeReturnPath(next);
};

export const getSafeAdminReturnPath = (search: string) => {
  const next = new URLSearchParams(search).get("next") ?? "";
  const safePath = getSafeReturnPathWithDefault(next, DEFAULT_ADMIN_RETURN_PATH);

  if (!safePath.startsWith("/admin") || safePath === "/admin/login") {
    return DEFAULT_ADMIN_RETURN_PATH;
  }

  return safePath;
};

export const getSafeReturnPath = (value: string) => {
  return getSafeReturnPathWithDefault(value, DEFAULT_AUTH_RETURN_PATH);
};

const getSafeReturnPathWithDefault = (value: string, fallbackPath: string) => {
  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallbackPath;
  }

  return trimmed;
};
