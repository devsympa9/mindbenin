import { getAdminToken } from "@/lib/admin"
import { API_URL } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * Les routes admin de l'API exigent le jeton administrateur : le relais
 * same-origin le lit dans le cookie et streame le fichier.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string; documentId: string }> },
) {
  const { reference, documentId } = await context.params
  const token = await getAdminToken()

  if (!token) {
    return new Response("Session administrateur expirée.", { status: 401 })
  }

  const upstream = await fetch(
    `${API_URL}/admin/dossiers/${encodeURIComponent(reference)}/documents/${encodeURIComponent(documentId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
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
