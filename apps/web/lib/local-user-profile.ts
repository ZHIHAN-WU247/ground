import type { AddressContact } from "@ground/shared";

const ACTIVE_PROFILE_KEY = "ground.activeUserProfile";
const PROFILE_INDEX_KEY = "ground.userProfiles";
export const LOCAL_USER_PROFILE_EVENT = "ground:local-user-profile-changed";

export type LocalUserProfile = AddressContact;

const isBrowser = () => typeof window !== "undefined";

const notifyProfileChange = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(LOCAL_USER_PROFILE_EVENT));
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeProfile = (profile: Partial<LocalUserProfile>): LocalUserProfile => {
  const locationCode = asString(profile.locationCode);
  const fiasGuid = asString(profile.fiasGuid);

  return {
    name: asString(profile.name),
    phone: asString(profile.phone),
    email: asString(profile.email),
    country: asString(profile.country) || "China",
    province: asString(profile.province),
    city: asString(profile.city),
    postalCode: asString(profile.postalCode),
    addressLine: asString(profile.addressLine),
    ...(locationCode ? { locationCode } : {}),
    ...(fiasGuid ? { fiasGuid } : {})
  };
};

const parseProfile = (value: unknown): LocalUserProfile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const profile = normalizeProfile(value);
  return profile.email || profile.name || profile.phone || profile.addressLine ? profile : null;
};

const readProfileIndex = (): Record<string, LocalUserProfile> => {
  if (!isBrowser()) {
    return {};
  }

  const raw = window.localStorage.getItem(PROFILE_INDEX_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, LocalUserProfile>>((profiles, [email, value]) => {
      const profile = parseProfile(value);

      if (profile) {
        profiles[email] = profile;
      }

      return profiles;
    }, {});
  } catch {
    return {};
  }
};

export const getActiveLocalUserProfile = () => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return parseProfile(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
};

export const findLocalUserProfileByEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return readProfileIndex()[normalizedEmail] ?? null;
};

export const saveLocalUserProfile = (profile: Partial<LocalUserProfile>) => {
  if (!isBrowser()) {
    return null;
  }

  const normalized = normalizeProfile(profile);
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(normalized));

  if (normalized.email) {
    const profiles = readProfileIndex();
    profiles[normalized.email.toLowerCase()] = normalized;
    window.localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(profiles));
  }

  notifyProfileChange();

  return normalized;
};

export const clearActiveLocalUserProfile = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
  notifyProfileChange();
};
