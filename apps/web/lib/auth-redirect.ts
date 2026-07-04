const DEFAULT_AUTH_RETURN_PATH = "/account/profile";

export const buildLoginRedirectPath = (returnPath: string) => `/auth/login?next=${encodeURIComponent(getSafeReturnPath(returnPath))}`;

export const getSafeAuthReturnPath = (search: string) => {
  const next = new URLSearchParams(search).get("next") ?? "";
  return getSafeReturnPath(next);
};

export const getSafeReturnPath = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  return trimmed;
};
