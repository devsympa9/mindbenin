import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { ApiError, apiFetch } from "@/lib/api"

export const ADMIN_COOKIE = "mb_admin"

export async function getAdminToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(ADMIN_COOKIE)?.value ?? null
}

export const requireAdmin = cache(async (): Promise<string> => {
  const token = await getAdminToken()

  if (!token) {
    redirect("/admin/login")
  }

  try {
    await apiFetch<{ ok: boolean }>("/admin/session", { token })
    return token
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirect("/admin/login")
    }

    throw error
  }
})
