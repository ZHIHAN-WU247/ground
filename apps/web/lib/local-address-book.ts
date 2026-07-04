import type { AddressContact } from "@ground/shared";

export type AddressBookKind = "sender" | "recipient";

export interface AddressBookEntry extends AddressContact {
  id: string;
  label: string;
  kind: AddressBookKind;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressBookStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface SenderOrderFields {
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCountry: string;
  senderProvince: string;
  senderCity: string;
  senderPostalCode: string;
  senderAddressLine: string;
  senderLocationCode: string;
  senderFiasGuid: string;
}

export interface RecipientOrderFields {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientCountry: string;
  recipientProvince: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientAddressLine: string;
  recipientLocationCode: string;
  recipientFiasGuid: string;
}

type AddressBookInput = AddressContact & Partial<Omit<AddressBookEntry, keyof AddressContact | "kind" | "label">> & {
  kind: AddressBookKind;
  label: string;
};

interface AddressBookOperation {
  storage?: AddressBookStorage;
  ownerEmail?: string;
}

interface SaveAddressBookEntryInput extends AddressBookOperation {
  entry: AddressBookInput;
}

interface ListAddressBookEntriesInput extends AddressBookOperation {
  kind?: AddressBookKind;
}

const STORAGE_PREFIX = "ground.addressBook";
const ANONYMOUS_OWNER = "anonymous";

const isBrowser = () => typeof window !== "undefined";

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const optionalString = (value: unknown) => {
  const normalized = trimString(value);
  return normalized ? normalized : undefined;
}

export const createMemoryAddressBookStorage = (): AddressBookStorage => {
  const items = new Map<string, string>();

  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    }
  };
};

export const getBrowserAddressBookStorage = (): AddressBookStorage | null => {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage;
};

export const getAddressBookStorageKey = (ownerEmail?: string) => {
  const owner = trimString(ownerEmail).toLowerCase() || ANONYMOUS_OWNER;
  return `${STORAGE_PREFIX}.${owner}`;
};

export const listAddressBookEntries = ({ storage = getBrowserAddressBookStorage() ?? undefined, ownerEmail, kind }: ListAddressBookEntriesInput = {}) => {
  if (!storage) {
    return [];
  }

  const entries = readEntries(storage, ownerEmail);
  const filteredEntries = kind ? entries.filter((entry) => entry.kind === kind) : entries;
  return filteredEntries.sort((current, next) => Number(next.isDefault) - Number(current.isDefault) || next.updatedAt.localeCompare(current.updatedAt));
};

export const saveAddressBookEntry = ({ storage = getBrowserAddressBookStorage() ?? undefined, ownerEmail, entry }: SaveAddressBookEntryInput) => {
  if (!storage) {
    return normalizeEntry(entry);
  }

  const entries = readEntries(storage, ownerEmail);
  const normalized = normalizeEntry(entry);
  const nextEntries = entries.filter((item) => item.id !== normalized.id);

  if (normalized.isDefault) {
    nextEntries.forEach((item) => {
      if (item.kind === normalized.kind) {
        item.isDefault = false;
      }
    });
  }

  nextEntries.unshift(normalized);
  writeEntries(storage, ownerEmail, nextEntries);
  return normalized;
};

export const deleteAddressBookEntry = ({ storage = getBrowserAddressBookStorage() ?? undefined, ownerEmail, id }: AddressBookOperation & { id: string }) => {
  if (!storage) {
    return;
  }

  writeEntries(storage, ownerEmail, readEntries(storage, ownerEmail).filter((entry) => entry.id !== id));
};

export function mapAddressToOrderFields(entry: AddressContact, kind: "sender"): SenderOrderFields;
export function mapAddressToOrderFields(entry: AddressContact, kind: "recipient"): RecipientOrderFields;
export function mapAddressToOrderFields(entry: AddressContact, kind: AddressBookKind) {
  if (kind === "sender") {
    return {
      senderName: entry.name,
      senderPhone: entry.phone,
      senderEmail: entry.email ?? "",
      senderCountry: entry.country,
      senderProvince: entry.province,
      senderCity: entry.city,
      senderPostalCode: entry.postalCode,
      senderAddressLine: entry.addressLine,
      senderLocationCode: entry.locationCode ?? "",
      senderFiasGuid: entry.fiasGuid ?? ""
    };
  }

  return {
    recipientName: entry.name,
    recipientPhone: entry.phone,
    recipientEmail: entry.email ?? "",
    recipientCountry: entry.country,
    recipientProvince: entry.province,
    recipientCity: entry.city,
    recipientPostalCode: entry.postalCode,
    recipientAddressLine: entry.addressLine,
    recipientLocationCode: entry.locationCode ?? "",
    recipientFiasGuid: entry.fiasGuid ?? ""
  };
}

const readEntries = (storage: AddressBookStorage, ownerEmail?: string): AddressBookEntry[] => {
  const raw = storage.getItem(getAddressBookStorageKey(ownerEmail));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(parseEntry).filter((entry): entry is AddressBookEntry => Boolean(entry));
  } catch {
    return [];
  }
};

const writeEntries = (storage: AddressBookStorage, ownerEmail: string | undefined, entries: AddressBookEntry[]) => {
  storage.setItem(getAddressBookStorageKey(ownerEmail), JSON.stringify(entries));
};

const normalizeEntry = (entry: AddressBookInput): AddressBookEntry => {
  const now = new Date().toISOString();
  const normalized: AddressBookEntry = {
    id: trimString(entry.id) || `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label: trimString(entry.label) || trimString(entry.name) || "Address",
    kind: entry.kind,
    isDefault: Boolean(entry.isDefault),
    name: trimString(entry.name),
    phone: trimString(entry.phone),
    country: trimString(entry.country),
    province: trimString(entry.province),
    city: trimString(entry.city),
    postalCode: trimString(entry.postalCode),
    addressLine: trimString(entry.addressLine),
    createdAt: trimString(entry.createdAt) || now,
    updatedAt: now
  };
  const email = optionalString(entry.email);
  const locationCode = optionalString(entry.locationCode);
  const fiasGuid = optionalString(entry.fiasGuid);

  if (email) {
    normalized.email = email;
  }

  if (locationCode) {
    normalized.locationCode = locationCode;
  }

  if (fiasGuid) {
    normalized.fiasGuid = fiasGuid;
  }

  return normalized;
};

const parseEntry = (value: unknown): AddressBookEntry | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Partial<AddressBookEntry>;
  const kind = record.kind === "sender" || record.kind === "recipient" ? record.kind : null;

  if (!kind) {
    return null;
  }

  const input: AddressBookInput = {
    id: trimString(record.id),
    label: record.label ?? "",
    kind,
    isDefault: Boolean(record.isDefault),
    name: record.name ?? "",
    phone: record.phone ?? "",
    country: record.country ?? "",
    province: record.province ?? "",
    city: record.city ?? "",
    postalCode: record.postalCode ?? "",
    addressLine: record.addressLine ?? ""
  };
  const email = optionalString(record.email);
  const locationCode = optionalString(record.locationCode);
  const fiasGuid = optionalString(record.fiasGuid);
  const createdAt = optionalString(record.createdAt);
  const updatedAt = optionalString(record.updatedAt);

  if (email) {
    input.email = email;
  }

  if (locationCode) {
    input.locationCode = locationCode;
  }

  if (fiasGuid) {
    input.fiasGuid = fiasGuid;
  }

  if (createdAt) {
    input.createdAt = createdAt;
  }

  if (updatedAt) {
    input.updatedAt = updatedAt;
  }

  const normalized = normalizeEntry(input);

  normalized.updatedAt = trimString(record.updatedAt) || normalized.updatedAt;
  return normalized;
};
