import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { SaveUserProfileDto } from "./dto/save-user-profile.dto";
import { UserProfileService } from "./user-profile.service";

@Controller("user-profile")
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get()
  findByEmail(@Query("email") email?: string) {
    return this.userProfileService.findByEmail(email);
  }

  @Post()
  saveProfile(@Body() input: SaveUserProfileDto) {
    return this.userProfileService.saveProfile(input);
  }
}
