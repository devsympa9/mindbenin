import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common"
import type { Response } from "express"

import type { AdminRequest, AdminRole } from "./admin.guard"
import { AdminGuard } from "./admin.guard"
import { AdminService } from "./admin.service"

type Actor = { id: string; role: AdminRole }

function actorOf(request: AdminRequest): Actor {
  return request.admin ?? { id: "admin", role: "agent" }
}

@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post("login")
  login(@Body() body: { code?: unknown }) {
    return this.admin.login(body?.code)
  }

  @Get("session")
  @UseGuards(AdminGuard)
  session(@Req() request: AdminRequest) {
    return { ok: true, role: actorOf(request).role }
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
    @Req() request: AdminRequest,
    @Param("reference") reference: string,
    @Body() body: { status?: unknown; message?: unknown },
  ) {
    return this.admin.updateStatus(reference, body, actorOf(request))
  }

  @Post("dossiers/:reference/pickup")
  @UseGuards(AdminGuard)
  collect(
    @Req() request: AdminRequest,
    @Param("reference") reference: string,
    @Body() body: { code?: unknown; target?: unknown },
  ) {
    return this.admin.collect(reference, body, actorOf(request))
  }

  @Get("dossiers/:reference/documents/:documentId")
  @UseGuards(AdminGuard)
  async document(
    @Param("reference") reference: string,
    @Param("documentId") documentId: string,
    @Res() response: Response,
  ) {
    const { document, body } = await this.admin.document(reference, documentId)

    response.setHeader("Content-Type", document.mimeType)
    response.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    )
    response.setHeader("Content-Length", String(body.length))
    response.end(body)
  }

  @Get("notifications")
  @UseGuards(AdminGuard)
  notifications(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.admin.notificationJournal({
      status,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post("notifications/retry")
  @UseGuards(AdminGuard)
  retry(@Req() request: AdminRequest) {
    return this.admin.retryNotifications(actorOf(request))
  }

  @Post("reminders/run")
  @UseGuards(AdminGuard)
  reminders(@Req() request: AdminRequest) {
    return this.admin.runReminders(actorOf(request))
  }

  @Get("audit")
  @UseGuards(AdminGuard)
  audit(@Query("limit") limit?: string) {
    return this.admin.audit(limit ? Number(limit) : undefined)
  }

  @Get("export")
  @UseGuards(AdminGuard)
  async export(
    @Req() request: AdminRequest,
    @Query("status") status: string | undefined,
    @Query("q") q: string | undefined,
    @Res() response: Response,
  ) {
    const csv = await this.admin.exportCsv({ status, q }, actorOf(request))
    const stamp = new Date().toISOString().slice(0, 10)

    response.setHeader("Content-Type", "text/csv; charset=utf-8")
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="mindbenin-dossiers-${stamp}.csv"`,
    )
    response.end(csv)
  }
}
