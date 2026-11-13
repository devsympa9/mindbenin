import Link from "next/link"
import { IconShieldCheck } from "@tabler/icons-react"

import { apiFetch } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { requireUser } from "@/lib/session"
import type { DossierDTO, ServiceDTO } from "@/lib/types"

import { Avatar } from "@/components/avatar"
import { ServiceCard } from "@/components/service-card"
import { StatusPill } from "@/components/status-pill"
import { VoiceCommand } from "@/components/voice-command"

export const dynamic = "force-dynamic"

export default async function AppHomePage() {
  const user = await requireUser()

  const [services, dossiers] = await Promise.all([
    apiFetch<ServiceDTO[]>("/services"),
    apiFetch<DossierDTO[]>("/dossiers"),
  ])

  const recent = dossiers.slice(0, 2)

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-muted-foreground">Bonjour</p>
        <h1 className="text-xl font-semibold tracking-tight">
          {user.firstName} {user.lastName}
        </h1>
      </section>

      <section className="flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-medium text-primary">
            <IconShieldCheck size={14} aria-hidden="true" /> Identité ANIP vérifiée
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            NPI {user.npi}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Né(e) le {formatDate(user.birthDate)} · {user.birthPlace}
          </p>
        </div>
      </section>

      <VoiceCommand />

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Services</h2>
            <p className="text-[11px] text-muted-foreground">
              Le prix officiel, plus 1 000 FCFA de confort.
            </p>
          </div>
          <Link
            href="/app/dossiers"
            className="shrink-0 text-[11px] font-medium text-primary hover:underline"
          >
            Mes dossiers
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Derniers dossiers</h2>
            <Link
              href="/app/dossiers"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Tout voir
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {recent.map((dossier) => (
              <Link
                key={dossier.reference}
                href={`/app/dossiers/${dossier.reference}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{dossier.service.shortName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {dossier.reference}
                  </p>
                </div>
                <StatusPill status={dossier.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="rounded-xl bg-secondary/60 p-3 text-[10px] leading-relaxed text-muted-foreground">
        MindBenin ne prend pas d&apos;argent à l&apos;État : la commission de confort est affichée
        avant chaque paiement. Démo — identité, administration et paiement simulés.
      </p>
    </div>
  )
}
