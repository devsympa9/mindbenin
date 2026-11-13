import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"

import { AdminGuard } from "./admin.guard"
import { AdminService } from "./admin.service"

@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post("login")
  login(@Body() body: { code?: unknown }) {
    return this.admin.login(body?.code)
  }

  @Get("session")
  @UseGuards(AdminGuard)
  session() {
    return { ok: true }
  }

  @Get("stats")
  @UseGuards(AdminGuard)
  stats() {
    return this.admin.stats()
  }

  @Get("dossiers")
  @UseGuards(AdminGuard)
  list(@Query("status") status?: string, @Query("q") q?: string) {
    return this.admin.list({ status, q })
  }

  @Get("dossiers/:reference")
  @UseGuards(AdminGuard)
  get(@Param("reference") reference: string) {
    return this.admin.get(reference)
  }

  @Post("dossiers/:reference/status")
  @UseGuards(AdminGuard)
  update(
    @Param("reference") reference: string,
    @Body() body: { status?: unknown; message?: unknown },
  ) {
    return this.admin.updateStatus(reference, body)
  }
}
