import Link from "next/link"
import { IconArrowRight, IconFiles } from "@tabler/icons-react"

import { ServiceIcon } from "@/components/service-icon"
import { StatusPill } from "@/components/status-pill"
import { apiFetch } from "@/lib/api"
import { formatDateTime, formatFcfa } from "@/lib/format"
import { requireUser } from "@/lib/session"
import type { DossierDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DossiersPage() {
  await requireUser()
  const dossiers = await apiFetch<DossierDTO[]>("/dossiers")

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Mes dossiers</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tous tes dossiers, du dépôt au retrait.
        </p>
      </header>

      {dossiers.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <IconFiles size={24} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold">Aucun dossier pour l&apos;instant</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisis un service, on remplit le formulaire avec ton NPI.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            Voir les services <IconArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="space-y-2.5">
          {dossiers.map((dossier) => (
            <Link
              key={dossier.reference}
              href={`/app/dossiers/${dossier.reference}`}
              className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ServiceIcon icon={dossier.service.icon} size={20} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{dossier.service.shortName}</p>
                  <StatusPill status={dossier.status} />
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {dossier.reference}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                  <span>{formatDateTime(dossier.createdAt)}</span>
                  <span className="font-medium text-foreground">
                    {formatFcfa(dossier.totalAmount)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
