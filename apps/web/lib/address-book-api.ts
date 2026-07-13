import { deleteJson, getJson, postJson } from "./api";
import {
  deleteAddressBookEntry,
  listAddressBookEntries,
  saveAddressBookEntry,
  type AddressBookEntry,
  type AddressBookKind
} from "./local-address-book";

interface AddressBookScope {
  ownerEmail?: string;
  kind: AddressBookKind;
}

export async function listPersistentAddressBookEntries({ ownerEmail, kind }: AddressBookScope): Promise<AddressBookEntry[]> {
  if (!ownerEmail) {
    return listAddressBookEntries({ kind });
  }

  try {
    return await getJson<AddressBookEntry[]>(`/address-book?kind=${encodeURIComponent(kind)}`);
  } catch {
    return listAddressBookEntries({ ownerEmail, kind });
  }
}

export async function savePersistentAddressBookEntry({ ownerEmail, entry }: { ownerEmail?: string; entry: AddressBookEntry }): Promise<AddressBookEntry> {
  if (!ownerEmail) {
    return saveAddressBookEntry({ entry });
  }

  try {
    return await postJson<AddressBookEntry, { entry: AddressBookEntry }>("/address-book", { entry });
  } catch {
    return saveAddressBookEntry({ ownerEmail, entry });
  }
}

export async function deletePersistentAddressBookEntry({ ownerEmail, id }: { ownerEmail?: string; id: string }): Promise<void> {
  if (!ownerEmail) {
    deleteAddressBookEntry({ id });
    return;
  }

  try {
    await deleteJson<{ ok: boolean }>(`/address-book/${encodeURIComponent(id)}`);
  } catch {
    deleteAddressBookEntry({ ownerEmail, id });
  }
}
