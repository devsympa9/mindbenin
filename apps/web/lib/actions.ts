"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ApiError, TOKEN_COOKIE, apiFetch } from "@/lib/api"
import type { DossierDTO, ScanResponse, UserDTO } from "@/lib/types"

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

export async function scanIdentityAction(): Promise<ActionResult<UserDTO>> {
  try {
    const result = await apiFetch<ScanResponse>("/identity/scan", { method: "POST" })
    const store = await cookies()
    store.set(TOKEN_COOKIE, result.token, COOKIE_OPTIONS)
    return { ok: true, data: result.user }
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

export async function logoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(TOKEN_COOKIE)
  redirect("/")
}
