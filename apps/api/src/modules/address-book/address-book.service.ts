import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../database/supabase.service";
import type { AddressBookEntry, AddressBookKind } from "./address-book.types";
import { SupabaseAddressBookStore, type SupabaseAddressBookClient } from "./supabase-address-book-store";

@Injectable()
export class AddressBookService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listEntries(ownerEmail?: string, kind?: AddressBookKind): Promise<AddressBookEntry[]> {
    return this.getStore().listEntries(ownerEmail, kind);
  }

  async saveEntry(ownerEmail: string | undefined, entry: AddressBookEntry): Promise<AddressBookEntry> {
    return this.getStore().saveEntry(ownerEmail, entry);
  }

  async deleteEntry(ownerEmail: string | undefined, id: string): Promise<void> {
    return this.getStore().deleteEntry(ownerEmail, id);
  }

  private getStore() {
    if (!this.supabaseService.client) {
      throw new Error("Supabase is not configured for address book persistence.");
    }

    return new SupabaseAddressBookStore(this.supabaseService.client as unknown as SupabaseAddressBookClient);
  }
}
