import { API_URL } from "@/lib/api"
import { getToken } from "@/lib/session"

export const dynamic = "force-dynamic"

/**
 * Relais SSE : le jeton reste dans le cookie httpOnly, jamais exposé au
 * navigateur. EventSource se connecte à cette route same-origin.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params
  const token = await getToken()

  if (!token) {
    return new Response("Session expirée.", { status: 401 })
  }

  const upstream = await fetch(
    `${API_URL}/dossiers/${encodeURIComponent(reference)}/stream?token=${encodeURIComponent(token)}`,
    { headers: { Accept: "text/event-stream" }, cache: "no-store" },
  )

  if (!upstream.ok || !upstream.body) {
    return new Response("Flux indisponible.", { status: upstream.status || 502 })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
