export type DossierStatusValue =
  | "DEMANDE_ENVOYEE"
  | "IDENTITE_VERIFIEE"
  | "EN_COURS_TRAITEMENT"
  | "PRET_A_RECUPERER"
  | "RECUPERE"
  | "ANNULE"

export const STATUS_META: Record<
  DossierStatusValue,
  { label: string; short: string; tone: "neutral" | "info" | "progress" | "success" | "danger" }
> = {
  DEMANDE_ENVOYEE: {
    label: "Demande envoyée",
    short: "Envoyée",
    tone: "neutral",
  },
  IDENTITE_VERIFIEE: {
    label: "Identité vérifiée",
    short: "Vérifiée",
    tone: "info",
  },
  EN_COURS_TRAITEMENT: {
    label: "En cours de traitement",
    short: "En traitement",
    tone: "progress",
  },
  PRET_A_RECUPERER: {
    label: "Prêt à récupérer",
    short: "Prêt",
    tone: "success",
  },
  RECUPERE: {
    label: "Récupéré",
    short: "Récupéré",
    tone: "success",
  },
  ANNULE: {
    label: "Annulé",
    short: "Annulé",
    tone: "danger",
  },
}

export type TrackingStep = {
  status: DossierStatusValue
  label: string
  description: string
  progress: number
}

export const TRACKING_STEPS: TrackingStep[] = [
  {
    status: "DEMANDE_ENVOYEE",
    label: "Demande envoyée",
    description: "Dossier créé et formulaire pré-rempli depuis ton NPI.",
    progress: 15,
  },
  {
    status: "IDENTITE_VERIFIEE",
    label: "Identité vérifiée",
    description: "L'ANIP a confirmé ton identité et ta photo.",
    progress: 40,
  },
  {
    status: "EN_COURS_TRAITEMENT",
    label: "En cours de traitement",
    description: "L'administration traite ton dossier.",
    progress: 70,
  },
  {
    status: "PRET_A_RECUPERER",
    label: "Prêt à récupérer",
    description: "Présente ton NPI au guichet de retrait.",
    progress: 100,
  },
]

const STATUS_ORDER: DossierStatusValue[] = TRACKING_STEPS.map((step) => step.status)

export function stepIndex(status: DossierStatusValue): number {
  const index = STATUS_ORDER.indexOf(status)
  return index === -1 ? 0 : index
}

export function statusProgress(status: DossierStatusValue): number {
  if (status === "ANNULE") return 0
  if (status === "RECUPERE") return 100
  return TRACKING_STEPS[stepIndex(status)]?.progress ?? 0
}

export function isFinalStatus(status: DossierStatusValue): boolean {
  return status === "PRET_A_RECUPERER" || status === "RECUPERE" || status === "ANNULE"
}

export const PAYMENT_PROVIDER_META = {
  MTN_MOMO: {
    label: "MTN MoMo",
    short: "MTN",
    hint: "Paiement mobile MTN Bénin",
  },
  MOOV_MONEY: {
    label: "Moov Money",
    short: "Moov",
    hint: "Paiement mobile Moov Bénin",
  },
} as const

export type PaymentProviderValue = keyof typeof PAYMENT_PROVIDER_META
