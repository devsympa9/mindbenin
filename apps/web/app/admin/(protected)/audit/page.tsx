import { redirect } from "next/navigation"

import { requireAdmin } from "@/lib/admin"
import { apiFetch } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { AuditDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Journal d'audit",
}

export default async function AdminAuditPage() {
  const token = await requireAdmin()
  const session = await apiFetch<{ role: string }>("/admin/session", { token })

  if (session.role !== "admin") {
    redirect("/admin")
  }

  const items = await apiFetch<AuditDTO[]>("/admin/audit", { token })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Journal d&apos;audit</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Connexions, changements de statut, retraits et exports : qui a fait quoi, quand.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border bg-card">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Aucune action enregistrée pour le moment.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {entry.role}
                </span>
                <span className="text-[11px] font-semibold">{entry.action}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{entry.target}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </span>
                {entry.meta !== null && entry.meta !== undefined && (
                  <span className="w-full truncate font-mono text-[9px] text-muted-foreground">
                    {JSON.stringify(entry.meta)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
