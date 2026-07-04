import assert from "node:assert/strict";

import type { AddressContact } from "@ground/shared";
import {
  createMemoryAddressBookStorage,
  getAddressBookStorageKey,
  mapAddressToOrderFields,
  saveAddressBookEntry,
  listAddressBookEntries
} from "./local-address-book";

const completeAddress: AddressContact = {
  name: "  Ivan Petrov  ",
  phone: " +7 900 000 0000 ",
  email: " ivan@example.com ",
  country: "Russia",
  province: "Moscow",
  city: "Moscow",
  postalCode: "101000",
  addressLine: "Tverskaya Street 1",
  locationCode: "44",
  fiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
};

const storage = createMemoryAddressBookStorage();

const savedRecipient = saveAddressBookEntry({
  storage,
  ownerEmail: "Customer@Example.com",
  entry: {
    ...completeAddress,
    id: "existing-id",
    label: "  Moscow home  ",
    kind: "recipient"
  }
});

assert.equal(getAddressBookStorageKey("Customer@Example.com"), "ground.addressBook.customer@example.com");
assert.equal(savedRecipient.name, "Ivan Petrov");
assert.equal(savedRecipient.email, "ivan@example.com");
assert.equal(savedRecipient.label, "Moscow home");
assert.equal(savedRecipient.kind, "recipient");
assert.equal(savedRecipient.isDefault, false);

const otherUserEntries = listAddressBookEntries({
  storage,
  ownerEmail: "other@example.com",
  kind: "recipient"
});
assert.equal(otherUserEntries.length, 0);

const recipientFields = mapAddressToOrderFields(savedRecipient, "recipient");
assert.deepEqual(recipientFields, {
  recipientName: "Ivan Petrov",
  recipientPhone: "+7 900 000 0000",
  recipientEmail: "ivan@example.com",
  recipientCountry: "Russia",
  recipientProvince: "Moscow",
  recipientCity: "Moscow",
  recipientPostalCode: "101000",
  recipientAddressLine: "Tverskaya Street 1",
  recipientLocationCode: "44",
  recipientFiasGuid: "c2deb16a-0330-4f05-821f-1d09c93331e6"
});

const savedSender = saveAddressBookEntry({
  storage,
  ownerEmail: "customer@example.com",
  entry: {
    ...completeAddress,
    country: "China",
    label: "Shenzhen warehouse",
    kind: "sender",
    isDefault: true
  }
});

const senderFields = mapAddressToOrderFields(savedSender, "sender");
assert.equal(senderFields.senderCountry, "China");
assert.equal(senderFields.senderName, "Ivan Petrov");
assert.equal(listAddressBookEntries({ storage, ownerEmail: "customer@example.com", kind: "sender" })[0]?.isDefault, true);
