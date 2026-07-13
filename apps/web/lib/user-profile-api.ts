import type { AddressContact } from "@ground/shared";
import { getJson, postJson } from "./api";
import { findLocalUserProfileByEmail, saveLocalUserProfile, type LocalUserProfile } from "./local-user-profile";

export async function findPersistentUserProfileByEmail(email: string): Promise<LocalUserProfile | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  try {
    const profile = await getJson<AddressContact | null>(`/user-profile?email=${encodeURIComponent(normalizedEmail)}`);
    return profile ? saveLocalUserProfile(profile) : findLocalUserProfileByEmail(normalizedEmail);
  } catch {
    return findLocalUserProfileByEmail(normalizedEmail);
  }
}

export async function savePersistentUserProfile(profile: LocalUserProfile): Promise<LocalUserProfile> {
  try {
    const saved = await postJson<AddressContact, AddressContact>("/user-profile", profile);
    return saveLocalUserProfile(saved) ?? saved;
  } catch {
    return saveLocalUserProfile(profile) ?? profile;
  }
}
