import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FileAssetsController } from "./file-assets.controller";
import { FileAssetsService } from "./file-assets.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [FileAssetsController],
  providers: [FileAssetsService],
  exports: [FileAssetsService]
})
export class FileAssetsModule {}
