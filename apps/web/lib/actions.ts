"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ApiError, TOKEN_COOKIE, apiFetch } from "@/lib/api"
import type {
  DocumentDTO,
  DossierDTO,
  NotificationDTO,
  PickupDTO,
  ProcurationDTO,
  ScanResponse,
  UserDTO,
} from "@/lib/types"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Impossible de joindre le serveur. Vérifie que l'API est démarrée."
}

export async function scanIdentityAction(
  image?: string,
  frames?: string[],
): Promise<ActionResult<UserDTO & { faceVerified?: boolean; simulated?: boolean }>> {
  try {
    const result = await apiFetch<ScanResponse>("/identity/scan", {
      method: "POST",
      body: {
        ...(image ? { image } : {}),
        ...(frames && frames.length > 1 ? { frames } : {}),
      },
    })
    const store = await cookies()
    store.set(TOKEN_COOKIE, result.token, COOKIE_OPTIONS)
    return {
      ok: true,
      data: { ...result.user, faceVerified: result.faceVerified, simulated: result.simulated },
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function createDossierAction(
  serviceSlug: string,
  formData: Record<string, string>,
): Promise<ActionResult<DossierDTO>> {
  try {
    const dossier = await apiFetch<DossierDTO>("/dossiers", {
      method: "POST",
      body: { serviceSlug, formData },
    })
    return { ok: true, data: dossier }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function payDossierAction(
  reference: string,
  provider: "MTN_MOMO" | "MOOV_MONEY",
  phone: string,
): Promise<ActionResult<DossierDTO>> {
  try {
    const dossier = await apiFetch<DossierDTO>(`/dossiers/${reference}/pay`, {
      method: "POST",
      body: { provider, phone },
    })
    return { ok: true, data: dossier }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function getDossierAction(reference: string): Promise<ActionResult<DossierDTO>> {
  try {
    const dossier = await apiFetch<DossierDTO>(`/dossiers/${reference}`)
    return { ok: true, data: dossier }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function uploadDocumentAction(
  reference: string,
  file: { name: string; mimeType: string; data: string },
): Promise<ActionResult<DocumentDTO>> {
  try {
    const document = await apiFetch<DocumentDTO>(
      `/dossiers/${encodeURIComponent(reference)}/documents`,
      { method: "POST", body: file },
    )
    return { ok: true, data: document }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function deleteDocumentAction(
  reference: string,
  documentId: string,
): Promise<ActionResult<{ ok: boolean }>> {
  try {
    const result = await apiFetch<{ ok: boolean }>(
      `/dossiers/${encodeURIComponent(reference)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" },
    )
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function getPickupAction(reference: string): Promise<ActionResult<PickupDTO>> {
  try {
    const pickup = await apiFetch<PickupDTO>(
      `/dossiers/${encodeURIComponent(reference)}/pickup`,
    )
    return { ok: true, data: pickup }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function createProcurationAction(
  reference: string,
  input: { holderName: string; holderPhone: string; holderIdNumber: string },
): Promise<ActionResult<ProcurationDTO | null>> {
  try {
    const result = await apiFetch<PickupDTO>(
      `/dossiers/${encodeURIComponent(reference)}/procuration`,
      { method: "POST", body: input },
    )
    return { ok: true, data: result.procuration }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function revokeProcurationAction(
  reference: string,
): Promise<ActionResult<{ ok: boolean }>> {
  try {
    const result = await apiFetch<{ ok: boolean }>(
      `/dossiers/${encodeURIComponent(reference)}/procuration`,
      { method: "DELETE" },
    )
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function notificationsAction(): Promise<ActionResult<NotificationDTO[]>> {
  try {
    const notifications = await apiFetch<NotificationDTO[]>("/notifications")
    return { ok: true, data: notifications }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function markNotificationsReadAction(): Promise<ActionResult<{ ok: boolean }>> {
  try {
    const result = await apiFetch<{ ok: boolean }>("/notifications/read", { method: "POST" })
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

/** Dernier dossier de l'usager : support de la commande vocale « où est mon dossier ? ». */
export async function latestDossierAction(): Promise<ActionResult<DossierDTO | null>> {
  try {
    const dossiers = await apiFetch<DossierDTO[]>("/dossiers")
    return { ok: true, data: dossiers[0] ?? null }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(TOKEN_COOKIE)
  redirect("/")
}
