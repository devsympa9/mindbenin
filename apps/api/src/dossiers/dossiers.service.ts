import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { toDossierDTO } from "../common/dossier-serialize"
import { isValidBeninPhone, normalizePhone } from "../common/phone"
import { parseServiceFields } from "../common/service-fields"
import { FedapayService } from "../fedapay/fedapay.service"
import { PrismaService } from "../prisma/prisma.service"

const INCLUDE = { service: true, payment: true, events: true, user: true } as const

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
        officialPrice: service.officialPrice,
        commission: service.commission,
        totalAmount: service.officialPrice + service.commission,
        pickupLocation: service.pickupLocation,
        events: {
          create: {
            status: "DEMANDE_ENVOYEE",
            message: "Dossier créé, formulaire pré-rempli depuis ton NPI.",
          },
        },
      },
      include: INCLUDE,
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

    return toDossierDTO(updated)
  }

  /**
   * Confirme un paiement FedaPay en interrogeant l'API : le statut de l'URL de
   * retour n'est jamais utilisé comme preuve.
   */
  async confirmFedapayPayment(reference: string, transactionId?: string): Promise<void> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { reference },
      include: { payment: true, events: true },
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
      include: { payment: true; events: true }
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
      include: { payment: true, events: true },
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
  }
}
