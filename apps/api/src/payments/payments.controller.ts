import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"

import { DossiersService } from "../dossiers/dossiers.service"
import { PrismaService } from "../prisma/prisma.service"

/** Ancienneté maximale acceptée pour un webhook (protection anti-rejeu). */
const SIGNATURE_TOLERANCE_SECONDS = 300

function equalHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8")
  const b = Buffer.from(right, "utf8")

  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * FedaPay signe ses webhooks avec le secret de l'endpoint (dashboard) au format
 * d'en-tête `t=<timestamp>,s=<hmac_sha256(timestamp + "." + corps brut)>`.
 * Doc : https://docs.fedapay.com/integration-api/webhooks
 * Sans secret configuré (démo), on accepte la requête pour ne pas bloquer le
 * parcours local ; dès qu'un secret est fourni, toute signature invalide est
 * refusée.
 */
function assertSignature(rawBody: string | undefined, signature: string | undefined) {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim()

  if (!secret) {
    return
  }

  if (!rawBody || !signature) {
    throw new UnauthorizedException("Signature FedaPay manquante.")
  }

  const parts = signature.split(",").reduce(
    (accumulator, item) => {
      const [key, ...rest] = item.trim().split("=")
      const value = rest.join("=")

      if (key === "t") {
        accumulator.timestamp = Number.parseInt(value, 10)
      }

      if (key === "s" && value) {
        accumulator.signatures.push(value)
      }

      return accumulator
    },
    { timestamp: Number.NaN, signatures: [] as string[] },
  )

  if (!Number.isFinite(parts.timestamp) || parts.signatures.length === 0) {
    throw new UnauthorizedException("Signature FedaPay invalide.")
  }

  const expected = createHmac("sha256", secret)
    .update(`${parts.timestamp}.${rawBody}`)
    .digest("hex")

  if (!parts.signatures.some((given) => equalHex(given, expected))) {
    throw new UnauthorizedException("Signature FedaPay invalide.")
  }

  const age = Math.floor(Date.now() / 1000) - parts.timestamp

  if (Math.abs(age) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new UnauthorizedException("Signature FedaPay expirée.")
  }
}

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
    // Format réel des événements FedaPay : { event, entity: { id, status } }.
    (payload.entity as Record<string, unknown> | undefined)?.id,
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
  async webhook(
    @Req() request: Request & { rawBody?: string },
    @Body() body: unknown,
    @Headers("x-fedapay-signature") signature?: string,
  ) {
    assertSignature(request.rawBody, signature)

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
