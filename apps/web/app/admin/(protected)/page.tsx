import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconFiles,
  IconSearch,
  IconWallet,
} from "@tabler/icons-react"
import Link from "next/link"

import { ServiceIcon } from "@/components/service-icon"
import { StatusPill } from "@/components/status-pill"
import { requireAdmin } from "@/lib/admin"
import { apiFetch } from "@/lib/api"
import { formatDateTime, formatFcfa } from "@/lib/format"
import type { DossierStatusValue } from "@/lib/status"
import type { AdminDossierDTO, AdminStats } from "@/lib/types"
import { cn } from "@workspace/ui/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "File de traitement",
}

const FILTERS: { value: "" | DossierStatusValue; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "DEMANDE_ENVOYEE", label: "Demandes" },
  { value: "IDENTITE_VERIFIEE", label: "Identité vérifiée" },
  { value: "EN_COURS_TRAITEMENT", label: "En traitement" },
  { value: "PRET_A_RECUPERER", label: "Prêts au retrait" },
  { value: "RECUPERE", label: "Récupérés" },
  { value: "ANNULE", label: "Annulés" },
]

function filterHref(status: string, q: string): string {
  const params = new URLSearchParams()

  if (status) params.set("statut", status)
  if (q) params.set("q", q)

  const query = params.toString()
  return query ? `/admin?${query}` : "/admin"
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  )
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>
}) {
  const token = await requireAdmin()
  const params = await searchParams
  const statut = params.statut ?? ""
  const q = params.q ?? ""

  const query = new URLSearchParams()
  if (statut) query.set("status", statut)
  if (q) query.set("q", q)

  const [stats, list] = await Promise.all([
    apiFetch<AdminStats>("/admin/stats", { token }),
    apiFetch<{ items: AdminDossierDTO[]; count: number }>(
      `/admin/dossiers?${query.toString()}`,
      { token },
    ),
  ])

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">File de traitement</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tous les dossiers citoyens, du paiement au retrait.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Dossiers"
          value={stats.total}
          hint={`${stats.today} aujourd'hui`}
          icon={<IconFiles size={15} aria-hidden="true" />}
        />
        <StatCard
          label="À traiter"
          value={stats.toProcess}
          hint="demandes à instruire"
          icon={<IconClock size={15} aria-hidden="true" />}
        />
        <StatCard
          label="Prêts au retrait"
          value={stats.byStatus.PRET_A_RECUPERER}
          hint="citoyens à notifier"
          icon={<IconCheck size={15} aria-hidden="true" />}
        />
        <StatCard
          label="Encaissé"
          value={formatFcfa(stats.revenue)}
          hint="paiements confirmés"
          icon={<IconWallet size={15} aria-hidden="true" />}
        />
      </div>

      <div className="space-y-3 rounded-2xl border bg-card p-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <Link
              key={filter.value || "all"}
              href={filterHref(filter.value, q)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                statut === filter.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <form action="/admin" method="get" className="flex gap-2">
          {statut && <input type="hidden" name="statut" value={statut} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Référence, NPI ou nom du citoyen"
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs outline-none transition focus:border-primary"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <IconSearch size={14} aria-hidden="true" /> Rechercher
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Dossiers</h2>
          <span className="text-[11px] text-muted-foreground">
            {list.count} résultat{list.count > 1 ? "s" : ""}
          </span>
        </div>

        {list.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Aucun dossier ne correspond à ce filtre.
          </p>
        ) : (
          <ul className="divide-y">
            {list.items.map((dossier) => (
              <li key={dossier.reference}>
                <Link
                  href={`/admin/dossiers/${dossier.reference}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-secondary/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ServiceIcon icon={dossier.service.icon} size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {dossier.service.shortName}{" "}
                      <span className="font-mono text-[10px] font-normal text-muted-foreground">
                        {dossier.reference}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {dossier.user.firstName} {dossier.user.lastName} · NPI{" "}
                      {dossier.user.npi} · {formatDateTime(dossier.createdAt)}
                    </p>
                  </div>

                  <span className="text-xs font-medium">{formatFcfa(dossier.totalAmount)}</span>
                  <StatusPill status={dossier.status} />

                  {dossier.manualOverride && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Manuel
                    </span>
                  )}

                  <IconArrowRight size={14} className="text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
