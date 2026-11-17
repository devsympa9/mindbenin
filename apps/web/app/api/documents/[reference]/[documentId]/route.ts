import { apiFetchRaw } from "@/lib/api"
import { getToken } from "@/lib/session"

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string; documentId: string }> },
) {
  const { reference, documentId } = await context.params
  const token = await getToken()

  if (!token) {
    return new Response("Session expirée.", { status: 401 })
  }

  const upstream = await apiFetchRaw(
    `/dossiers/${encodeURIComponent(reference)}/documents/${encodeURIComponent(documentId)}`,
    token,
  )

  if (!upstream.ok || !upstream.body) {
    return new Response("Pièce introuvable.", { status: upstream.status || 502 })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? "inline",
      "Cache-Control": "private, no-store",
    },
  })
}
