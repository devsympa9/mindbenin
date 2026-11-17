import { apiFetchRaw } from "@/lib/api"
import { getToken } from "@/lib/session"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params
  const token = await getToken()

  if (!token) {
    return new Response("Session expirée.", { status: 401 })
  }

  const upstream = await apiFetchRaw(
    `/dossiers/${encodeURIComponent(reference)}/receipt`,
    token,
  )

  if (!upstream.ok || !upstream.body) {
    return new Response("Reçu indisponible.", { status: upstream.status || 502 })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
