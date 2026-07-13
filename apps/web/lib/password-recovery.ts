export const PASSWORD_RECOVERY_PATH = "/auth/reset-password";

export function isPasswordRecoveryHash(hash: string) {
  const normalizedHash = hash.trim().replace(/^#/, "");
  const params = new URLSearchParams(normalizedHash);
  return params.get("type") === "recovery" && Boolean(params.get("access_token")) && Boolean(params.get("refresh_token"));
}

export function buildPasswordRecoveryPath(hash: string) {
  return `${PASSWORD_RECOVERY_PATH}${hash.startsWith("#") ? hash : `#${hash}`}`;
}
