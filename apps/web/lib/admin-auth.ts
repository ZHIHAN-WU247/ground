import type { AddressContact } from "@ground/shared";

const FIXED_ADMIN_ACCOUNT = "cdek";
const FIXED_ADMIN_PASSWORD = "cdek123";
const FIXED_ADMIN_EMAIL = "cdek@ground.local";

const FIXED_ADMIN_PROFILE: AddressContact = {
  name: "CDEK Admin",
  phone: "+86 0000 000000",
  email: FIXED_ADMIN_EMAIL,
  country: "China",
  province: "Shanghai",
  city: "Shanghai",
  postalCode: "200000",
  addressLine: "GROUND admin console"
};

const normalizeAccount = (value: string) => value.trim().toLowerCase();

export function authenticateAdminAccount(account: string, password: string) {
  const normalizedAccount = normalizeAccount(account);
  const matchedAccount = normalizedAccount === FIXED_ADMIN_ACCOUNT || normalizedAccount === FIXED_ADMIN_EMAIL;

  if (!matchedAccount || password !== FIXED_ADMIN_PASSWORD) {
    return { ok: false as const };
  }

  return {
    ok: true as const,
    profile: { ...FIXED_ADMIN_PROFILE }
  };
}

export function isFixedAdminAccount(account: string) {
  const normalizedAccount = normalizeAccount(account);
  return normalizedAccount === FIXED_ADMIN_ACCOUNT || normalizedAccount === FIXED_ADMIN_EMAIL;
}

export function isFixedAdminEmail(email: string) {
  return normalizeAccount(email) === FIXED_ADMIN_EMAIL;
}

export function getFixedAdminEmail() {
  return FIXED_ADMIN_EMAIL;
}
