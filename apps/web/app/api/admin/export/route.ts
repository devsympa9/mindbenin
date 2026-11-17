import { getAdminToken } from "@/lib/admin"
import { apiFetchRaw } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const token = await getAdminToken()

  if (!token) {
    return new Response("Session administrateur expirée.", { status: 401 })
  }

  const incoming = new URL(request.url)
  const query = new URLSearchParams()

  const status = incoming.searchParams.get("statut")
  const q = incoming.searchParams.get("q")

  if (status) query.set("status", status)
  if (q) query.set("q", q)

  const upstream = await apiFetchRaw(`/admin/export?${query.toString()}`, token)

  if (!upstream.ok || !upstream.body) {
    return new Response("Export indisponible.", { status: upstream.status || 502 })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="dossiers.csv"',
      "Cache-Control": "no-store",
    },
  })
}
