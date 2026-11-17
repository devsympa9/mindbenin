import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import QRCode from "qrcode"

import { isValidBeninPhone, normalizePhone } from "../common/phone"
import { PrismaService } from "../prisma/prisma.service"

export const PICKUP_PREFIX = "MINDBN"

export type ProcurationBody = {
  holderName?: unknown
  holderPhone?: unknown
  holderIdNumber?: unknown
}

type DossierWithPickup = Prisma.DossierGetPayload<{
  include: { procuration: true }
}>

function makeCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000))
}

@Injectable()
export class PickupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Code de retrait à 6 chiffres, généré à la création du dossier. */
  async generateCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = makeCode()
      const exists = await this.prisma.dossier.findFirst({
        where: { pickupCode: code },
        select: { id: true },
      })

      if (!exists) {
        return code
      }
    }

    return makeCode()
  }

  payload(reference: string, code: string): string {
    return `${PICKUP_PREFIX}|${reference}|${code}`
  }

  parsePayload(value: string): { reference: string; code: string } | null {
    const parts = value.trim().split("|")

    if (parts.length !== 3 || parts[0] !== PICKUP_PREFIX) {
      return null
    }

    const [, reference, code] = parts

    if (!reference || !/^\d{6}$/.test(code ?? "")) {
      return null
    }

    return { reference, code }
  }

  async details(userId: string, reference: string) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      include: { procuration: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    return this.decorate(dossier)
  }

  async upsertProcuration(userId: string, reference: string, body: ProcurationBody) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      include: { procuration: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    if (dossier.status === "RECUPERE" || dossier.status === "ANNULE") {
      throw new BadRequestException("Ce dossier est clôturé : la procuration n'est plus utile.")
    }

    const holderName =
      typeof body?.holderName === "string" ? body.holderName.trim().slice(0, 120) : ""
    const holderPhone = typeof body?.holderPhone === "string" ? normalizePhone(body.holderPhone) : ""
    const holderIdNumber =
      typeof body?.holderIdNumber === "string" ? body.holderIdNumber.trim().slice(0, 40) : ""

    if (holderName.length < 3) {
      throw new BadRequestException("Indique le nom complet de la personne qui retire le document.")
    }

    if (!isValidBeninPhone(holderPhone)) {
      throw new BadRequestException("Numéro du mandataire invalide. Format : 01 XX XX XX XX.")
    }

    if (holderIdNumber.length < 4) {
      throw new BadRequestException("Indique le numéro de pièce d'identité du mandataire.")
    }

    const procuration = await this.prisma.procuration.upsert({
      where: { dossierId: dossier.id },
      create: {
        dossierId: dossier.id,
        holderName,
        holderPhone,
        holderIdNumber,
        code: makeCode(),
      },
      update: {
        holderName,
        holderPhone,
        holderIdNumber,
        revokedAt: null,
      },
    })

    const refreshed = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossier.id },
      include: { procuration: true },
    })

    return {
      ...(await this.decorate(refreshed)),
      procuration: this.procurationDTO(procuration, refreshed.status === "PRET_A_RECUPERER"),
    }
  }

  async revokeProcuration(userId: string, reference: string) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      select: { id: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    await this.prisma.procuration.updateMany({
      where: { dossierId: dossier.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    return { ok: true }
  }

  /**
   * Valide le retrait au guichet. Accepte le code du dossier ou celui de la
   * procuration, et refuse tout ce qui n'est pas encore prêt.
   */
  async collect(reference: string, code: string, target: "DOSSIER" | "PROCURATION" = "DOSSIER") {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { procuration: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    if (dossier.status === "RECUPERE") {
      throw new BadRequestException("Ce dossier a déjà été retiré.")
    }

    if (dossier.status !== "PRET_A_RECUPERER") {
      throw new BadRequestException("Le dossier n'est pas encore prêt à être retiré.")
    }

    const expected =
      target === "PROCURATION" && dossier.procuration && !dossier.procuration.revokedAt
        ? dossier.procuration.code
        : (dossier.pickupCode ?? "")

    if (!expected || expected !== code.trim()) {
      throw new BadRequestException("Code de retrait invalide.")
    }

    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.dossier.update({
        where: { id: dossier.id },
        data: { status: "RECUPERE", collectedAt: now, manualOverride: true },
      }),
      this.prisma.dossierEvent.create({
        data: {
          dossierId: dossier.id,
          status: "RECUPERE",
          message:
            target === "PROCURATION"
              ? `Document remis à ${dossier.procuration?.holderName ?? "un mandataire"} sur présentation de la procuration.`
              : "Document remis au guichet sur présentation du QR de retrait.",
          createdAt: now,
        },
      }),
    ])

    return { reference, status: "RECUPERE" as const, collectedAt: now.toISOString() }
  }

  private async decorate(dossier: DossierWithPickup) {
    // Le code et le QR ne sont révélés qu'au moment du retrait : avant, ils
    // n'ont aucun usage et ne doivent pas traîner dans une capture d'écran.
    const available = dossier.status === "PRET_A_RECUPERER"
    const code = available ? (dossier.pickupCode ?? "") : ""
    const payload = code ? this.payload(dossier.reference, code) : ""

    const qrSvg = payload
      ? await QRCode.toString(payload, {
          type: "svg",
          margin: 1,
          width: 220,
          errorCorrectionLevel: "M",
          color: { dark: "#064e3b", light: "#ffffff" },
        })
      : null

    return {
      reference: dossier.reference,
      code,
      payload,
      qrSvg,
      available,
      collectedAt: dossier.collectedAt?.toISOString() ?? null,
      pickupLocation: dossier.pickupLocation,
      procuration: this.procurationDTO(dossier.procuration, available),
    }
  }

  private procurationDTO(
    procuration: {
      holderName: string
      holderPhone: string
      holderIdNumber: string
      code: string
      revokedAt: Date | null
      createdAt: Date
    } | null,
    revealCode: boolean,
  ) {
    if (!procuration) {
      return null
    }

    return {
      holderName: procuration.holderName,
      holderPhone: procuration.holderPhone,
      holderIdNumber: procuration.holderIdNumber,
      code: revealCode ? procuration.code : "",
      revokedAt: procuration.revokedAt?.toISOString() ?? null,
      active: !procuration.revokedAt,
      createdAt: procuration.createdAt.toISOString(),
    }
  }
}
