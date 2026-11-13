import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { ApiError, TOKEN_COOKIE, apiFetch } from "@/lib/api"
import type { UserDTO } from "@/lib/types"

export async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(TOKEN_COOKIE)?.value ?? null
}

export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const token = await getToken()

  if (!token) {
    return null
  }

  try {
    return await apiFetch<UserDTO>("/identity/me", { token })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
})

export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/scan")
  }

  return user
}
