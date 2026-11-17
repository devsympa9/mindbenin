import Link from "next/link"
import { IconBrandWhatsapp, IconMessage } from "@tabler/icons-react"

import { AdminTools } from "@/components/admin/admin-tools"
import { requireAdmin } from "@/lib/admin"
import { apiFetch } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { NotificationDTO } from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Journal des notifications",
}

const STATUS_STYLES: Record<NotificationDTO["status"], string> = {
  ENVOYE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  SIMULE: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  EN_ATTENTE: "bg-secondary text-muted-foreground",
  ECHEC: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
}

const FILTERS = [
  { value: "", label: "Toutes" },
  { value: "ENVOYE", label: "Envoyées" },
  { value: "SIMULE", label: "Journal" },
  { value: "ECHEC", label: "Échecs" },
]

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  const token = await requireAdmin()
  const params = await searchParams
  const statut = params.statut ?? ""

  const items = await apiFetch<NotificationDTO[]>(
    `/admin/notifications?${statut ? `status=${statut}` : ""}`,
    { token },
  )

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Journal des notifications</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Chaque SMS et message WhatsApp est journalisé, même sans opérateur configuré.
        </p>
      </header>

      <AdminTools />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value || "all"}
            href={filter.value ? `/admin/notifications?statut=${filter.value}` : "/admin/notifications"}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition",
              statut === filter.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:border-primary/40",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Aucune notification pour ce filtre.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {item.channel === "WHATSAPP" ? (
                    <IconBrandWhatsapp size={15} aria-hidden="true" />
                  ) : (
                    <IconMessage size={15} aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold">{item.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        STATUS_STYLES[item.status],
                      )}
                    >
                      {item.status.toLowerCase()}
                    </span>
                    {item.dossier?.reference && (
                      <Link
                        href={`/admin/dossiers/${item.dossier.reference}`}
                        className="font-mono text-[10px] text-primary hover:underline"
                      >
                        {item.dossier.reference}
                      </Link>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {item.recipient} · {item.provider ?? "journal"} · {formatDateTime(item.createdAt)}
                    {item.error ? ` · ${item.error}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
