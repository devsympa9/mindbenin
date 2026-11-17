import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { NotificationsService } from "./notifications.service"

type RequestWithUser = { user: { id: string } }

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: RequestWithUser) {
    return this.notifications.listForUser(request.user.id)
  }

  @Post("read")
  async markRead(@Req() request: RequestWithUser) {
    await this.notifications.markAllRead(request.user.id)
    return { ok: true }
  }
}
