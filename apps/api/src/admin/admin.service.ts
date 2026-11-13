import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import type { Prisma } from "@prisma/client"
import { createHash, timingSafeEqual } from "node:crypto"

import { toAdminDossierDTO } from "../common/dossier-serialize"
import { PrismaService } from "../prisma/prisma.service"

const STATUSES = [
  "DEMANDE_ENVOYEE",
  "IDENTITE_VERIFIEE",
  "EN_COURS_TRAITEMENT",
  "PRET_A_RECUPERER",
  "RECUPERE",
  "ANNULE",
] as const

type Status = (typeof STATUSES)[number]

const STATUS_LABELS: Record<Status, string> = {
  DEMANDE_ENVOYEE: "Demande envoyée",
  IDENTITE_VERIFIEE: "Identité vérifiée",
  EN_COURS_TRAITEMENT: "En cours de traitement",
  PRET_A_RECUPERER: "Prêt à récupérer",
  RECUPERE: "Récupéré",
  ANNULE: "Annulé",
}

const TRANSITIONS: Record<Status, Status[]> = {
  DEMANDE_ENVOYEE: ["IDENTITE_VERIFIEE", "ANNULE"],
  IDENTITE_VERIFIEE: ["EN_COURS_TRAITEMENT", "ANNULE"],
  EN_COURS_TRAITEMENT: ["PRET_A_RECUPERER", "ANNULE"],
  PRET_A_RECUPERER: ["RECUPERE", "ANNULE"],
  RECUPERE: [],
  ANNULE: [],
}

const INCLUDE = { service: true, payment: true, events: true, user: true } as const

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
}

function sameCode(candidate: string, expected: string): boolean {
  const left = createHash("sha256").update(candidate).digest()
  const right = createHash("sha256").update(expected).digest()
  return timingSafeEqual(left, right)
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(code: unknown) {
    const expected = process.env.ADMIN_ACCESS_CODE?.trim() || "mindbenin-admin"

    if (typeof code !== "string" || !sameCode(code.trim(), expected)) {
      throw new UnauthorizedException("Code administrateur invalide.")
    }

    const token = await this.jwt.signAsync(
      { sub: "admin", role: "admin" },
      { expiresIn: "12h" },
    )

    return { token }
  }

  async stats() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [total, today, revenue, byStatus] = await Promise.all([
      this.prisma.dossier.count(),
      this.prisma.dossier.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.payment.aggregate({
        where: { status: "REUSSI" },
        _sum: { amount: true },
      }),
      this.prisma.dossier.groupBy({ by: ["status"], _count: { _all: true } }),
    ])

    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
      Status,
      number
    >

    for (const row of byStatus) {
      counts[row.status] = row._count._all
    }

    return {
      total,
      today,
      revenue: revenue._sum.amount ?? 0,
      toProcess:
        counts.DEMANDE_ENVOYEE + counts.IDENTITE_VERIFIEE + counts.EN_COURS_TRAITEMENT,
      byStatus: counts,
    }
  }

  async list(params: { status?: string; q?: string }) {
    const status = isStatus(params.status) ? params.status : undefined
    const q = params.q?.trim() ?? ""
    const where: Prisma.DossierWhereInput = {}

    if (status) {
      where.status = status
    }

    if (q) {
      where.OR = [
        { reference: { contains: q, mode: "insensitive" } },
        { user: { npi: { contains: q } } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ]
    }

    const items = await this.prisma.dossier.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return { items: items.map((dossier) => this.decorate(dossier)), count: items.length }
  }

  async get(reference: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: INCLUDE,
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    return this.decorate(dossier)
  }

  async updateStatus(reference: string, body: { status?: unknown; message?: unknown }) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { payment: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    const next = body?.status

    if (!isStatus(next)) {
      throw new BadRequestException("Statut invalide.")
    }

    if (!TRANSITIONS[dossier.status].includes(next)) {
      throw new BadRequestException(
        `Transition impossible depuis « ${STATUS_LABELS[dossier.status]} ».`,
      )
    }

    if (
      (next === "PRET_A_RECUPERER" || next === "RECUPERE") &&
      dossier.payment?.status !== "REUSSI"
    ) {
      throw new BadRequestException(
        "Le paiement doit être confirmé avant de passer à cette étape.",
      )
    }

    const note = typeof body.message === "string" ? body.message.trim().slice(0, 500) : ""
    const message =
      note || `Statut mis à jour par l'administration : ${STATUS_LABELS[next]}.`

    await this.prisma.$transaction([
      this.prisma.dossier.update({
        where: { id: dossier.id },
        data: {
          status: next,
          manualOverride: true,
          ...(next === "PRET_A_RECUPERER" ? { readyAt: new Date() } : {}),
        },
      }),
      this.prisma.dossierEvent.create({
        data: { dossierId: dossier.id, status: next, message },
      }),
    ])

    return this.get(reference)
  }

  private decorate(dossier: Prisma.DossierGetPayload<{ include: typeof INCLUDE }>) {
    return {
      ...toAdminDossierDTO(dossier),
      nextStatuses: TRANSITIONS[dossier.status],
    }
  }
}
