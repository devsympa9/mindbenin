import { cookies } from "next/headers"

export const TOKEN_COOKIE = "mb_token"

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type ApiFetchOptions = {
  method?: "GET" | "POST"
  body?: unknown
  token?: string
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = options.token ?? (await cookies()).get(TOKEN_COOKIE)?.value

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" ")
      : payload?.message

    throw new ApiError(response.status, message ?? "Une erreur est survenue.")
  }

  return (await response.json()) as T
}
