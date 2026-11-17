import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import type { Prisma } from "@prisma/client"
import { createHash, timingSafeEqual } from "node:crypto"

import type { AdminRole } from "./admin.guard"
import { toAdminDossierDTO } from "../common/dossier-serialize"
import { DocumentsService } from "../dossiers/documents.service"
import { PickupService } from "../dossiers/pickup.service"
import { NotificationsService } from "../notifications/notifications.service"
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

const INCLUDE = {
  service: true,
  payment: true,
  events: true,
  user: true,
  documents: true,
  procuration: true,
} as const

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
}

function sameCode(candidate: string, expected: string): boolean {
  const left = createHash("sha256").update(candidate).digest()
  const right = createHash("sha256").update(expected).digest()
  return timingSafeEqual(left, right)
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly pickup: PickupService,
    private readonly notifications: NotificationsService,
    private readonly documents: DocumentsService,
  ) {}

  async login(code: unknown) {
    const adminCode = process.env.ADMIN_ACCESS_CODE?.trim() || "mindbenin-admin"
    const agentCode = process.env.ADMIN_AGENT_CODE?.trim()

    if (typeof code !== "string") {
      throw new UnauthorizedException("Code administrateur invalide.")
    }

    const candidate = code.trim()

    let role: AdminRole | null = null

    if (sameCode(candidate, adminCode)) {
      role = "admin"
    } else if (agentCode && sameCode(candidate, agentCode)) {
      role = "agent"
    }

    if (!role) {
      throw new UnauthorizedException("Code administrateur invalide.")
    }

    const token = await this.jwt.signAsync({ sub: role, role }, { expiresIn: "12h" })

    await this.record(role, role, "LOGIN", role)

    return { token, role }
  }

  async stats() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [total, today, revenue, byStatus, needsDocuments, notificationsFailed] =
      await Promise.all([
        this.prisma.dossier.count(),
        this.prisma.dossier.count({ where: { createdAt: { gte: startOfDay } } }),
        this.prisma.payment.aggregate({
          where: { status: "REUSSI" },
          _sum: { amount: true },
        }),
        this.prisma.dossier.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.dossier.count({
          where: { status: { in: ["IDENTITE_VERIFIEE", "EN_COURS_TRAITEMENT"] } },
        }),
        this.prisma.notification.count({ where: { status: "ECHEC" } }),
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
      needsDocuments,
      notificationsFailed,
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

  async updateStatus(
    reference: string,
    body: { status?: unknown; message?: unknown },
    actor: { id: string; role: AdminRole },
  ) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { payment: true, user: { select: { id: true, phone: true } } },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    const next = body?.status

    if (!isStatus(next)) {
      throw new BadRequestException("Statut invalide.")
    }

    if (next === "ANNULE" && actor.role !== "admin") {
      throw new ForbiddenException("Seul un administrateur peut annuler un dossier.")
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

    await this.notifications.notifyQuietly({
      dossierId: dossier.id,
      userId: dossier.user.id,
      phone: dossier.user.phone,
      title: `${reference} — ${STATUS_LABELS[next]}`,
      body: message,
    })

    await this.record(actor.id, actor.role, "STATUS", reference, {
      from: dossier.status,
      to: next,
    })

    return this.get(reference)
  }

  async collect(
    reference: string,
    body: { code?: unknown; target?: unknown },
    actor: { id: string; role: AdminRole },
  ) {
    const code = typeof body?.code === "string" ? body.code.trim() : ""

    if (!code) {
      throw new BadRequestException("Scanne le QR de retrait ou saisis le code à 6 chiffres.")
    }

    const target = body?.target === "PROCURATION" ? "PROCURATION" : "DOSSIER"
    const result = await this.pickup.collect(reference, code, target)

    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      select: { id: true, userId: true, user: { select: { phone: true } } },
    })

    if (dossier) {
      await this.notifications.notifyQuietly({
        dossierId: dossier.id,
        userId: dossier.userId,
        phone: dossier.user.phone,
        title: `${reference} — document retiré`,
        body: "Document retiré au guichet. Merci d'avoir utilisé MindBenin.",
      })
    }

    await this.record(actor.id, actor.role, "PICKUP", reference, { target })

    return result
  }

  async document(reference: string, documentId: string) {
    return this.documents.downloadForAdmin(reference, documentId)
  }

  async audit(limit = 80) {
    return this.prisma.adminAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    })
  }

  async notificationJournal(params: { status?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 60, 200)

    return this.prisma.notification.findMany({
      where:
        params.status === "ECHEC" || params.status === "ENVOYE" || params.status === "SIMULE"
          ? { status: params.status }
          : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { dossier: { select: { reference: true } } },
    })
  }

  async retryNotifications(actor: { id: string; role: AdminRole }) {
    const result = await this.notifications.pendingRetry()
    await this.record(actor.id, actor.role, "NOTIFICATIONS_RETRY", "journal", result)
    return result
  }

  /**
   * Relance les dossiers créés il y a plus de 24 h et jamais payés.
   * Appelée manuellement depuis le back-office (ou par tâche planifiée).
   */
  async runReminders(actor: { id: string; role: AdminRole }) {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const dossiers = await this.prisma.dossier.findMany({
      where: {
        status: "DEMANDE_ENVOYEE",
        reminderSentAt: null,
        createdAt: { lt: threshold },
        payment: { is: null },
      },
      include: { user: { select: { id: true, phone: true } }, service: true },
      take: 50,
    })

    let sent = 0

    for (const dossier of dossiers) {
      const created = await this.notifications.notifyQuietly({
        dossierId: dossier.id,
        userId: dossier.user.id,
        phone: dossier.user.phone,
        title: `Rappel — ${dossier.reference}`,
        body: `Ton dossier ${dossier.reference} (${dossier.service.name}) attend son paiement de ${new Intl.NumberFormat(
          "fr-FR",
        ).format(dossier.totalAmount)} FCFA. Paie depuis MindBenin pour lancer le traitement.`,
      })

      if (created.length > 0) {
        sent += 1
        await this.prisma.dossier.update({
          where: { id: dossier.id },
          data: { reminderSentAt: new Date() },
        })
      }
    }

    await this.record(actor.id, actor.role, "REMINDERS", "dossiers", {
      candidates: dossiers.length,
      sent,
    })

    return { candidates: dossiers.length, sent }
  }

  async exportCsv(params: { status?: string; q?: string }, actor: { id: string; role: AdminRole }) {
    const { items } = await this.list(params)

    const header = [
      "reference",
      "service",
      "statut",
      "nom",
      "prenoms",
      "npi",
      "telephone",
      "montant",
      "paiement",
      "recu",
      "pieces",
      "cree_le",
      "retire_le",
    ]

    const rows = items.map((item) =>
      [
        item.reference,
        item.service.name,
        STATUS_LABELS[item.status as Status] ?? item.status,
        item.user.lastName,
        item.user.firstName,
        item.user.npi,
        item.user.phone ?? "",
        item.totalAmount,
        item.payment?.status ?? "AUCUN",
        item.payment?.receipt ?? "",
        item.documents.length,
        item.createdAt,
        item.collectedAt ?? "",
      ]
        .map(csvCell)
        .join(";"),
    )

    await this.record(actor.id, actor.role, "EXPORT", "dossiers", { rows: rows.length })

    return `\uFEFF${[header.map(csvCell).join(";"), ...rows].join("\r\n")}`
  }

  private async record(
    actor: string,
    role: string,
    action: string,
    target: string,
    meta?: unknown,
  ) {
    try {
      await this.prisma.adminAudit.create({
        data: {
          actor,
          role,
          action,
          target,
          meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })
    } catch {
      // Le journal ne doit jamais bloquer une action métier.
    }
  }

  private decorate(dossier: Prisma.DossierGetPayload<{ include: typeof INCLUDE }>) {
    return {
      ...toAdminDossierDTO(dossier),
      nextStatuses: TRANSITIONS[dossier.status],
    }
  }
}
