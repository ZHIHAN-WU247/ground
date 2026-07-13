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
