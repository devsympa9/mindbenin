import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { IdentityService } from "./identity.service"

@Controller("identity")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post("scan")
  scan() {
    return this.identity.scan()
  }

  @UseGuards(AuthGuard)
  @Get("me")
  me(@Req() request: { user: { id: string } }) {
    return this.identity.me(request.user.id)
  }
}
