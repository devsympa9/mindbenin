import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { DossiersService } from "./dossiers.service"
import type { CreateDossierBody, PayDossierBody } from "./dossiers.service"

type RequestWithUser = { user: { id: string } }

@Controller("dossiers")
@UseGuards(AuthGuard)
export class DossiersController {
  constructor(private readonly dossiers: DossiersService) {}

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
}
