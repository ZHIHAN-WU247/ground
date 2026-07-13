import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/supabase-token.service";
import { SupabaseTokenGuard } from "../auth/supabase-token.guard";
import { AddressBookService } from "./address-book.service";
import type { AddressBookEntry, AddressBookKind } from "./address-book.types";
import { SaveAddressBookEntryDto } from "./dto/save-address-book-entry.dto";

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller("address-book")
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  @Get()
  @UseGuards(SupabaseTokenGuard)
  listEntries(@Req() request: RequestWithUser, @Query("kind") kind?: AddressBookKind, @Query("ownerEmail") _ownerEmail?: string) {
    return this.addressBookService.listEntries(request.user.email, kind);
  }

  @Post()
  @UseGuards(SupabaseTokenGuard)
  saveEntry(@Req() request: RequestWithUser, @Body() input: SaveAddressBookEntryDto) {
    return this.addressBookService.saveEntry(request.user.email, input.entry as AddressBookEntry);
  }

  @Delete(":id")
  @UseGuards(SupabaseTokenGuard)
  async deleteEntry(@Param("id") id: string, @Req() request: RequestWithUser, @Query("ownerEmail") _ownerEmail?: string) {
    await this.addressBookService.deleteEntry(request.user.email, id);
    return { ok: true };
  }
}
