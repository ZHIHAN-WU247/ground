import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AddressBookController } from "./address-book.controller";
import { AddressBookService } from "./address-book.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AddressBookController],
  providers: [AddressBookService]
})
export class AddressBookModule {}
