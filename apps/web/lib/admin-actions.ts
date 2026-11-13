"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ADMIN_COOKIE, getAdminToken } from "@/lib/admin"
import { ApiError, apiFetch } from "@/lib/api"
import type { AdminDossierDTO } from "@/lib/types"

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12,
}

export type AdminActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Impossible de joindre le serveur. Vérifie que l'API est démarrée."
}

export async function adminLoginAction(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await apiFetch<{ token: string }>("/admin/login", {
      method: "POST",
      body: { code },
    })
    const store = await cookies()
    store.set(ADMIN_COOKIE, result.token, COOKIE_OPTIONS)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function adminUpdateStatusAction(
  reference: string,
  status: string,
  message: string,
): Promise<AdminActionResult<AdminDossierDTO>> {
  const token = await getAdminToken()

  if (!token) {
    return { ok: false, error: "Session administrateur expirée. Reconnecte-toi." }
  }

  try {
    const dossier = await apiFetch<AdminDossierDTO>(
      `/admin/dossiers/${encodeURIComponent(reference)}/status`,
      { method: "POST", token, body: { status, message } },
    )

    revalidatePath("/admin")
    revalidatePath(`/admin/dossiers/${reference}`)

    return { ok: true, data: dossier }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

export async function adminLogoutAction(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
  redirect("/admin/login")
}
