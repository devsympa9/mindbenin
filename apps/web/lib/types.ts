import type { DossierStatusValue, PaymentProviderValue } from "@/lib/status"

export type ServiceField = {
  name: string
  label: string
  type: "text" | "select"
  options?: string[]
  required?: boolean
  placeholder?: string
}

export type ServiceDTO = {
  id: string
  slug: string
  name: string
  shortName: string
  description: string
  icon: string
  officialPrice: number
  commission: number
  amountField: string | null
  processingDays: number
  pickupLocation: string
  requirements: string[]
  fields: ServiceField[]
  active: boolean
  createdAt: string
}

export type UserDTO = {
  id: string
  npi: string
  firstName: string
  lastName: string
  birthDate: string
  birthPlace: string
  gender: string
  phone: string | null
}

export type DocumentDTO = {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: string
}

export type ProcurationDTO = {
  holderName: string
  holderPhone: string
  holderIdNumber: string
  code: string
  active: boolean
  createdAt: string
}

export type PickupDTO = {
  reference: string
  code: string
  payload: string
  qrSvg: string | null
  available: boolean
  collectedAt: string | null
  pickupLocation: string
  procuration: ProcurationDTO | null
}

export type NotificationDTO = {
  id: string
  channel: "SMS" | "WHATSAPP"
  recipient: string
  title: string
  body: string
  status: "EN_ATTENTE" | "ENVOYE" | "SIMULE" | "ECHEC"
  provider: string | null
  error: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
  dossier?: { reference: string } | null
}

export type AuditDTO = {
  id: string
  actor: string
  role: string
  action: string
  target: string
  meta: unknown
  createdAt: string
}

export type DossierDTO = {
  reference: string
  status: DossierStatusValue
  createdAt: string
  readyAt: string | null
  collectedAt: string | null
  documents: DocumentDTO[]
  procuration: ProcurationDTO | null
  officialPrice: number
  commission: number
  totalAmount: number
  pickupLocation: string
  formData: Record<string, string>
  service: {
    slug: string
    name: string
    shortName: string
    icon: string
    processingDays: number
  }
  payment: {
    provider: PaymentProviderValue
    phone: string
    receipt: string
    status: "EN_ATTENTE" | "REUSSI" | "ECHOUE"
    checkoutUrl: string | null
    paidAt: string | null
  } | null
  events: {
    status: DossierStatusValue
    message: string
    createdAt: string
  }[]
  user: {
    firstName: string
    lastName: string
    npi: string
  }
}

export type ScanResponse = {
  token: string
  user: UserDTO
  faceVerified?: boolean
  simulated?: boolean
}

export type AdminDossierDTO = DossierDTO & {
  manualOverride: boolean
  nextStatuses: DossierStatusValue[]
  user: DossierDTO["user"] & {
    phone: string | null
    birthDate: string
    birthPlace: string
  }
}

export type AdminStats = {
  total: number
  today: number
  revenue: number
  toProcess: number
  needsDocuments: number
  notificationsFailed: number
  byStatus: Record<DossierStatusValue, number>
}
