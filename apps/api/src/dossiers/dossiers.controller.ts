import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Response } from "express"

import { AuthGuard } from "../auth/auth.guard"
import { DocumentsService } from "./documents.service"
import { DossiersService } from "./dossiers.service"
import type { CreateDossierBody, PayDossierBody } from "./dossiers.service"
import { PickupService } from "./pickup.service"
import type { ProcurationBody } from "./pickup.service"

type RequestWithUser = { user: { id: string } }

@Controller("dossiers")
@UseGuards(AuthGuard)
export class DossiersController {
  constructor(
    private readonly dossiers: DossiersService,
    private readonly documents: DocumentsService,
    private readonly pickup: PickupService,
  ) {}

  @Post()
  create(@Req() request: RequestWithUser, @Body() body: CreateDossierBody) {
    return this.dossiers.create(request.user.id, body)
  }

  @Get()
  list(@Req() request: RequestWithUser) {
    return this.dossiers.list(request.user.id)
  }

  @Get(":reference")
  get(@Req() request: RequestWithUser, @Param("reference") reference: string) {
    return this.dossiers.get(request.user.id, reference)
  }

  @Post(":reference/pay")
  pay(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Body() body: PayDossierBody,
  ) {
    return this.dossiers.pay(request.user.id, reference, body)
  }

  @Get(":reference/receipt")
  async receipt(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Res() response: Response,
  ) {
    const { buffer, filename } = await this.dossiers.receipt(request.user.id, reference)

    response.setHeader("Content-Type", "application/pdf")
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    response.setHeader("Content-Length", String(buffer.length))
    response.end(buffer)
  }

  @Post(":reference/documents")
  upload(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Body() body: { name?: unknown; mimeType?: unknown; data?: unknown },
  ) {
    return this.documents.upload(request.user.id, reference, body)
  }

  @Get(":reference/documents")
  listDocuments(@Req() request: RequestWithUser, @Param("reference") reference: string) {
    return this.documents.list(request.user.id, reference)
  }

  @Get(":reference/documents/:documentId")
  async download(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Param("documentId") documentId: string,
    @Res() response: Response,
  ) {
    const { document, body } = await this.documents.download(
      request.user.id,
      reference,
      documentId,
    )

    response.setHeader("Content-Type", document.mimeType)
    response.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    )
    response.setHeader("Content-Length", String(body.length))
    response.end(body)
  }

  @Delete(":reference/documents/:documentId")
  removeDocument(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Param("documentId") documentId: string,
  ) {
    return this.documents.remove(request.user.id, reference, documentId)
  }

  @Get(":reference/pickup")
  pickupDetails(@Req() request: RequestWithUser, @Param("reference") reference: string) {
    return this.pickup.details(request.user.id, reference)
  }

  @Post(":reference/procuration")
  createProcuration(
    @Req() request: RequestWithUser,
    @Param("reference") reference: string,
    @Body() body: ProcurationBody,
  ) {
    return this.pickup.upsertProcuration(request.user.id, reference, body)
  }

  @Delete(":reference/procuration")
  revokeProcuration(@Req() request: RequestWithUser, @Param("reference") reference: string) {
    return this.pickup.revokeProcuration(request.user.id, reference)
  }
}
