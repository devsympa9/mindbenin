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

export type DossierDTO = {
  reference: string
  status: DossierStatusValue
  createdAt: string
  readyAt: string | null
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
  byStatus: Record<DossierStatusValue, number>
}
