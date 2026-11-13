import { Body, Controller, Get, Logger, Post, Query, Res } from "@nestjs/common"
import type { Response } from "express"

import { DossiersService } from "../dossiers/dossiers.service"
import { PrismaService } from "../prisma/prisma.service"

function extractTransactionId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null
  }

  const payload = body as Record<string, unknown>

  const candidates = [
    payload.id,
    payload.object_id,
    payload.transaction_id,
    (payload.data as Record<string, unknown> | undefined)?.id,
    (payload.transaction as Record<string, unknown> | undefined)?.id,
    (payload["v1/transaction"] as Record<string, unknown> | undefined)?.id,
  ]

  const found = candidates.find(
    (value) => typeof value === "string" || typeof value === "number",
  )

  return found === undefined ? null : String(found)
}

@Controller("payments")
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)

  constructor(
    private readonly dossiers: DossiersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("fedapay/callback")
  async callback(
    @Query("reference") reference: string | undefined,
    @Query("id") id: string | undefined,
    @Res() response: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000"
    const target = (path: string) => response.redirect(`${webOrigin}${path}`)

    if (!reference) {
      return target("/app/dossiers")
    }

    try {
      await this.dossiers.confirmFedapayPayment(reference, id)
      return target(`/app/dossiers/${encodeURIComponent(reference)}?paiement=retour`)
    } catch (error) {
      this.logger.error(`Callback FedaPay en échec pour ${reference} : ${String(error)}`)
      return target(`/app/dossiers/${encodeURIComponent(reference)}?paiement=erreur`)
    }
  }

  @Post("fedapay/webhook")
  async webhook(@Body() body: unknown) {
    const transactionId = extractTransactionId(body)

    if (!transactionId) {
      return { received: true }
    }

    const payment = await this.prisma.payment.findFirst({
      where: { fedapayId: transactionId },
      include: { dossier: { select: { reference: true } } },
    })

    if (payment?.dossier) {
      try {
        await this.dossiers.confirmFedapayPayment(payment.dossier.reference, transactionId)
      } catch (error) {
        this.logger.error(
          `Webhook FedaPay en échec pour ${payment.dossier.reference} : ${String(error)}`,
        )
      }
    }

    return { received: true }
  }
}
