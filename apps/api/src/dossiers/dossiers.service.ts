import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { toDossierDTO } from "../common/dossier-serialize"
import { isValidBeninPhone, normalizePhone } from "../common/phone"
import { buildReceiptPdf } from "../common/receipt-pdf"
import { parseServiceFields } from "../common/service-fields"
import { FedapayService } from "../fedapay/fedapay.service"
import { NotificationsService } from "../notifications/notifications.service"
import { PrismaService } from "../prisma/prisma.service"
import { PickupService } from "./pickup.service"

const INCLUDE = {
  service: true,
  payment: true,
  events: true,
  user: true,
  documents: true,
  procuration: true,
} as const

const STATUS_NOTIFICATIONS: Record<string, string> = {
  IDENTITE_VERIFIEE:
    "Identité vérifiée. Ton dossier entre en traitement : tu recevras un message à chaque étape.",
  EN_COURS_TRAITEMENT: "Ton dossier est en cours de traitement par l'administration.",
  PRET_A_RECUPERER:
    "Ton document est prêt. Présente le QR de retrait de ton dossier au guichet, muni de ton NPI.",
  RECUPERE: "Document retiré. Merci d'avoir utilisé MindBenin.",
  ANNULE: "Ton dossier a été annulé. Contacte le support si c'est une erreur.",
}

const STEP_DELAYS = [
  {
    status: "IDENTITE_VERIFIEE" as const,
    delay: 0,
    message: "Identité confirmée par l'ANIP.",
  },
  {
    status: "EN_COURS_TRAITEMENT" as const,
    delay: 10_000,
    message: "Dossier transmis à l'administration.",
  },
  {
    status: "PRET_A_RECUPERER" as const,
    delay: 25_000,
    message: "Ton document est prêt au retrait.",
  },
]

export type CreateDossierBody = {
  serviceSlug?: unknown
  formData?: unknown
}

export type PayDossierBody = {
  provider?: unknown
  phone?: unknown
}

function formatBirthDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function makeReceipt(): string {
  return `MB-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

@Injectable()
export class DossiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fedapay: FedapayService,
    private readonly notifications: NotificationsService,
    private readonly pickup: PickupService,
  ) {}

  async create(userId: string, body: CreateDossierBody) {
    const serviceSlug = typeof body?.serviceSlug === "string" ? body.serviceSlug : null

    if (!serviceSlug) {
      throw new BadRequestException("Service invalide.")
    }

    const service = await this.prisma.service.findUnique({ where: { slug: serviceSlug } })

    if (!service || !service.active) {
      throw new NotFoundException("Service introuvable.")
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.")
    }

    const fields = parseServiceFields(service.fields)
    const raw =
      typeof body.formData === "object" && body.formData !== null
        ? (body.formData as Record<string, unknown>)
        : {}

    const answers: Record<string, string> = {}

    for (const field of fields) {
      const value = raw[field.name]
      const text = typeof value === "string" ? value.trim() : ""

      if (field.required && !text) {
        throw new BadRequestException(`Le champ « ${field.label} » est requis.`)
      }

      if (field.type === "select" && text) {
        const canonical = field.options?.find(
          (option) => option.normalize("NFC") === text.normalize("NFC"),
        )

        if (!canonical) {
          throw new BadRequestException(`Valeur invalide pour « ${field.label} ».`)
        }

        answers[field.name] = canonical
        continue
      }

      if (text) {
        answers[field.name] = text
      }
    }

    let officialPrice = service.officialPrice

    if (service.amountField) {
      const rawAmount = answers[service.amountField] ?? ""
      const amount = Number(rawAmount.replace(/[^0-9]/g, ""))

      if (!Number.isInteger(amount) || amount < 500 || amount > 1_000_000) {
        throw new BadRequestException(
          "Montant de facture invalide. Indique un montant entre 500 et 1 000 000 FCFA.",
        )
      }

      officialPrice = amount
      answers[service.amountField] = `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`
    }

    const formData: Record<string, string> = {
      nom: user.lastName,
      prenoms: user.firstName,
      dateNaissance: formatBirthDate(user.birthDate),
      lieuNaissance: user.birthPlace,
      npi: user.npi,
      ...answers,
    }

    const dossier = await this.prisma.dossier.create({
      data: {
        reference: await this.generateReference(),
        userId: user.id,
        serviceId: service.id,
        status: "DEMANDE_ENVOYEE",
        formData: formData as Prisma.InputJsonValue,
        officialPrice,
        commission: service.commission,
        totalAmount: officialPrice + service.commission,
        pickupLocation: service.pickupLocation,
        pickupCode: await this.pickup.generateCode(),
        events: {
          create: {
            status: "DEMANDE_ENVOYEE",
            message: "Dossier créé, formulaire pré-rempli depuis ton NPI.",
          },
        },
      },
      include: INCLUDE,
    })

    await this.notifications.notifyQuietly({
      dossierId: dossier.id,
      userId: user.id,
      phone: user.phone,
      title: `Dossier ${dossier.reference} créé`,
      body: `${service.name} : dossier ${dossier.reference} enregistré. Montant à payer : ${new Intl.NumberFormat(
        "fr-FR",
      ).format(dossier.totalAmount)} FCFA. Paie sur MindBenin pour lancer le traitement.`,
    })

    return toDossierDTO(dossier)
  }

  async list(userId: string) {
    const dossiers = await this.prisma.dossier.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    })

    await Promise.all(dossiers.map((dossier) => this.advance(dossier.reference)))

    const refreshed = await this.prisma.dossier.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    })

    return refreshed.map(toDossierDTO)
  }

  async get(userId: string, reference: string) {
    const owned = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      select: { id: true },
    })

    if (!owned) {
      throw new NotFoundException("Dossier introuvable.")
    }

    await this.advance(reference)

    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: INCLUDE,
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    return toDossierDTO(dossier)
  }

  async pay(userId: string, reference: string, body: PayDossierBody) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      include: INCLUDE,
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    if (dossier.payment?.status === "REUSSI") {
      return toDossierDTO(dossier)
    }

    const provider = body?.provider
    const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : ""

    if (provider !== "MTN_MOMO" && provider !== "MOOV_MONEY") {
      throw new BadRequestException("Choisis un opérateur mobile money.")
    }

    if (!isValidBeninPhone(phone)) {
      throw new BadRequestException("Numéro invalide. Format attendu : 01 XX XX XX XX.")
    }

    if (this.fedapay.enabled) {
      await this.createFedapayCheckout(dossier, provider, phone)
    } else {
      await this.simulatePayment(dossier, provider, phone)
    }

    const updated = await this.prisma.dossier.findUnique({
      where: { reference },
      include: INCLUDE,
    })

    if (!updated) {
      throw new NotFoundException("Dossier introuvable.")
    }

    if (updated.payment?.status === "REUSSI") {
      await this.notifications.notifyQuietly({
        dossierId: updated.id,
        userId: updated.userId,
        phone: phone || updated.user.phone,
        title: `Paiement confirmé — ${updated.reference}`,
        body: `Paiement de ${new Intl.NumberFormat("fr-FR").format(
          updated.totalAmount,
        )} FCFA reçu pour ${updated.service.name}. Reçu ${updated.payment.receipt}. Ton dossier passe en traitement.`,
      })
    }

    return toDossierDTO(updated)
  }

  /** Reçu PDF du paiement : disponible uniquement si le paiement est réussi. */
  async receipt(userId: string, reference: string): Promise<{ buffer: Buffer; filename: string }> {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      include: INCLUDE,
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    if (!dossier.payment || dossier.payment.status !== "REUSSI" || !dossier.payment.paidAt) {
      throw new BadRequestException("Le reçu sera disponible dès la confirmation du paiement.")
    }

    const buffer = buildReceiptPdf({
      reference: dossier.reference,
      serviceName: dossier.service.name,
      amount: dossier.payment.amount,
      receipt: dossier.payment.receipt,
      transactionRef: dossier.payment.transactionRef,
      provider: dossier.payment.provider === "MTN_MOMO" ? "MTN MoMo" : "Moov Money",
      phone: dossier.payment.phone,
      paidAt: dossier.payment.paidAt,
      customerName: `${dossier.user.firstName} ${dossier.user.lastName}`,
      npi: dossier.user.npi,
      pickupLocation: dossier.pickupLocation,
    })

    return { buffer, filename: `recu-${dossier.reference}.pdf` }
  }

  /**
   * Confirme un paiement FedaPay en interrogeant l'API : le statut de l'URL de
   * retour n'est jamais utilisé comme preuve.
   */
  async confirmFedapayPayment(reference: string, transactionId?: string): Promise<void> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { payment: true, events: true, user: { select: { id: true, phone: true } } },
    })

    if (!dossier?.payment || dossier.payment.status === "REUSSI") {
      return
    }

    const fedapayId = transactionId ?? dossier.payment.fedapayId

    if (!fedapayId || !this.fedapay.enabled) {
      return
    }

    const transaction = await this.fedapay.retrieve(fedapayId)
    const status = String(transaction.status ?? "")

    if (status === "approved") {
      await this.markAsPaid(dossier)
      return
    }

    if (status === "declined" || status === "canceled" || status === "expired") {
      await this.prisma.payment.update({
        where: { dossierId: dossier.id },
        data: { status: "ECHOUE" },
      })
    }
  }

  private async createFedapayCheckout(
    dossier: Prisma.DossierGetPayload<{ include: typeof INCLUDE }>,
    provider: "MTN_MOMO" | "MOOV_MONEY",
    phone: string,
  ): Promise<void> {
    const checkout = await this.fedapay.createCheckout({
      amount: dossier.totalAmount,
      description: `${dossier.service.name} — dossier ${dossier.reference}`,
      merchantReference: dossier.reference,
      customer: {
        firstName: dossier.user.firstName,
        lastName: dossier.user.lastName,
        email: `${dossier.user.npi}@mindbenin.bj`,
        phone,
      },
    })

    const receipt = makeReceipt()

    await this.prisma.payment.upsert({
      where: { dossierId: dossier.id },
      create: {
        dossierId: dossier.id,
        provider,
        phone,
        amount: dossier.totalAmount,
        status: "EN_ATTENTE",
        receipt,
        transactionRef: `FEDAPAY-${checkout.transactionId}`,
        checkoutUrl: checkout.checkoutUrl,
        fedapayId: checkout.transactionId,
      },
      update: {
        provider,
        phone,
        amount: dossier.totalAmount,
        status: "EN_ATTENTE",
        receipt,
        transactionRef: `FEDAPAY-${checkout.transactionId}`,
        checkoutUrl: checkout.checkoutUrl,
        fedapayId: checkout.transactionId,
        paidAt: null,
      },
    })
  }

  private async simulatePayment(
    dossier: Prisma.DossierGetPayload<{ include: typeof INCLUDE }>,
    provider: "MTN_MOMO" | "MOOV_MONEY",
    phone: string,
  ): Promise<void> {
    const now = new Date()
    const receipt = makeReceipt()
    const transactionRef = `SIM-${now.getTime().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`

    await this.prisma.$transaction([
      this.prisma.payment.upsert({
        where: { dossierId: dossier.id },
        create: {
          dossierId: dossier.id,
          provider,
          phone,
          amount: dossier.totalAmount,
          status: "REUSSI",
          receipt,
          transactionRef,
          paidAt: now,
        },
        update: {
          provider,
          phone,
          amount: dossier.totalAmount,
          status: "REUSSI",
          receipt,
          transactionRef,
          paidAt: now,
          checkoutUrl: null,
          fedapayId: null,
        },
      }),
      this.prisma.dossier.update({
        where: { id: dossier.id },
        data: { status: "IDENTITE_VERIFIEE" },
      }),
      ...(dossier.events.some((event) => event.status === "IDENTITE_VERIFIEE")
        ? []
        : [
            this.prisma.dossierEvent.create({
              data: {
                dossierId: dossier.id,
                status: "IDENTITE_VERIFIEE",
                message: "Paiement reçu. Identité confirmée par l'ANIP.",
                createdAt: now,
              },
            }),
          ]),
    ])
  }

  private async markAsPaid(
    dossier: Prisma.DossierGetPayload<{
      include: { payment: true; events: true; user: { select: { id: true; phone: true } } }
    }>,
  ): Promise<void> {
    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { dossierId: dossier.id },
        data: { status: "REUSSI", paidAt: now },
      }),
      this.prisma.dossier.update({
        where: { id: dossier.id },
        data: { status: "IDENTITE_VERIFIEE" },
      }),
      ...(dossier.events.some((event) => event.status === "IDENTITE_VERIFIEE")
        ? []
        : [
            this.prisma.dossierEvent.create({
              data: {
                dossierId: dossier.id,
                status: "IDENTITE_VERIFIEE",
                message: "Paiement FedaPay confirmé. Identité vérifiée par l'ANIP.",
                createdAt: now,
              },
            }),
          ]),
    ])

    await this.notifyStatus(dossier.id, dossier.user.phone, "IDENTITE_VERIFIEE", dossier.user.id)
  }

  private async generateReference(): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const reference = `BJ-${new Date().getFullYear()}-${Math.floor(10_000 + Math.random() * 90_000)}`
      const exists = await this.prisma.dossier.findUnique({
        where: { reference },
        select: { id: true },
      })

      if (!exists) {
        return reference
      }
    }

    throw new BadRequestException("Impossible de générer une référence, réessaie.")
  }

  /**
   * Simulation du traitement asynchrone de l'administration :
   * le dossier avance automatiquement après le paiement.
   */
  private async advance(reference: string): Promise<void> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { payment: true, events: true, user: { select: { phone: true, id: true } } },
    })

    if (
      !dossier ||
      dossier.manualOverride ||
      dossier.payment?.status !== "REUSSI" ||
      !dossier.payment.paidAt ||
      dossier.status === "RECUPERE" ||
      dossier.status === "ANNULE"
    ) {
      return
    }

    const paidAt = dossier.payment.paidAt
    const elapsed = Date.now() - paidAt.getTime()
    const reached = STEP_DELAYS.filter((step) => elapsed >= step.delay)
    const existing = new Set(dossier.events.map((event) => event.status))
    const missing = reached.filter((step) => !existing.has(step.status))

    if (missing.length === 0) {
      return
    }

    const latest = reached[reached.length - 1]!

    await this.prisma.$transaction([
      this.prisma.dossier.update({
        where: { id: dossier.id },
        data: {
          status: latest.status,
          ...(latest.status === "PRET_A_RECUPERER"
            ? { readyAt: new Date(paidAt.getTime() + latest.delay) }
            : {}),
        },
      }),
      ...missing.map((step, index) =>
        this.prisma.dossierEvent.create({
          data: {
            dossierId: dossier.id,
            status: step.status,
            message: step.message,
            createdAt: new Date(paidAt.getTime() + step.delay + index),
          },
        }),
      ),
    ])

    for (const step of missing) {
      await this.notifyStatus(dossier.id, dossier.user.phone, step.status, dossier.user.id)
    }
  }

  private async notifyStatus(
    dossierId: string,
    phone: string | null | undefined,
    status: string,
    userId?: string,
  ) {
    const body = STATUS_NOTIFICATIONS[status]

    if (!body) {
      return
    }

    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { reference: true, service: { select: { shortName: true } } },
    })

    if (!dossier) {
      return
    }

    await this.notifications.notifyQuietly({
      dossierId,
      userId,
      phone,
      title: `${dossier.service.shortName} — ${dossier.reference}`,
      body,
    })
  }
}
