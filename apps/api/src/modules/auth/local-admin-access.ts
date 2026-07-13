const fixedLocalAdminEmails = ["admin@ground.local", "ops@ground.local", "cdek@ground.local"];

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function getLocalAdminEmails(
  configuredValue = process.env.GROUND_LOCAL_ADMIN_EMAILS,
  nodeEnv = process.env.NODE_ENV,
  enabledValue = process.env.GROUND_ENABLE_LOCAL_ADMIN
) {
  if (nodeEnv === "production" && enabledValue !== "true") {
    return [];
  }

  const configured = configuredValue
    ?.split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return Array.from(new Set([...configured, ...fixedLocalAdminEmails]));
  }

  return [...fixedLocalAdminEmails];
}

export function isLocalAdminEmail(
  email: string,
  configuredValue = process.env.GROUND_LOCAL_ADMIN_EMAILS,
  nodeEnv = process.env.NODE_ENV,
  enabledValue = process.env.GROUND_ENABLE_LOCAL_ADMIN
) {
  return getLocalAdminEmails(configuredValue, nodeEnv, enabledValue).includes(normalizeEmail(email));
}
