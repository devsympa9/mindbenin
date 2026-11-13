import type { Prisma } from "@prisma/client"

export type DossierWithRelations = Prisma.DossierGetPayload<{
  include: { service: true; payment: true; events: true; user: true }
}>

export function toAdminDossierDTO(dossier: DossierWithRelations) {
  const base = toDossierDTO(dossier)

  return {
    ...base,
    manualOverride: dossier.manualOverride,
    user: {
      ...base.user,
      phone: dossier.user.phone,
      birthDate: dossier.user.birthDate.toISOString(),
      birthPlace: dossier.user.birthPlace,
    },
  }
}

export function toDossierDTO(dossier: DossierWithRelations) {
  const formData =
    typeof dossier.formData === "object" &&
    dossier.formData !== null &&
    !Array.isArray(dossier.formData)
      ? Object.fromEntries(
          Object.entries(dossier.formData as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {}

  return {
    reference: dossier.reference,
    status: dossier.status,
    createdAt: dossier.createdAt.toISOString(),
    readyAt: dossier.readyAt?.toISOString() ?? null,
    officialPrice: dossier.officialPrice,
    commission: dossier.commission,
    totalAmount: dossier.totalAmount,
    pickupLocation: dossier.pickupLocation,
    formData,
    service: {
      slug: dossier.service.slug,
      name: dossier.service.name,
      shortName: dossier.service.shortName,
      icon: dossier.service.icon,
      processingDays: dossier.service.processingDays,
    },
    payment: dossier.payment
      ? {
          provider: dossier.payment.provider,
          phone: dossier.payment.phone,
          receipt: dossier.payment.receipt,
          status: dossier.payment.status,
          checkoutUrl: dossier.payment.checkoutUrl,
          paidAt: dossier.payment.paidAt?.toISOString() ?? null,
        }
      : null,
    events: dossier.events
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => ({
        status: event.status,
        message: event.message,
        createdAt: event.createdAt.toISOString(),
      })),
    user: {
      firstName: dossier.user.firstName,
      lastName: dossier.user.lastName,
      npi: dossier.user.npi,
    },
  }
}
