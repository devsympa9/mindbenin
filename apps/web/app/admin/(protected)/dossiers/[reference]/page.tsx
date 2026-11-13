import {
  IconArrowLeft,
  IconMapPin,
  IconPhone,
  IconReceipt2,
  IconUser,
} from "@tabler/icons-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { StatusForm } from "@/components/admin/status-form"
import { ServiceIcon } from "@/components/service-icon"
import { StatusPill } from "@/components/status-pill"
import { requireAdmin } from "@/lib/admin"
import { ApiError, apiFetch } from "@/lib/api"
import { formatDate, formatDateTime, formatFcfa } from "@/lib/format"
import { PAYMENT_PROVIDER_META, STATUS_META } from "@/lib/status"
import type { AdminDossierDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

const FIELD_LABELS: Record<string, string> = {
  nom: "Nom",
  prenoms: "Prénoms",
  dateNaissance: "Date de naissance",
  lieuNaissance: "Lieu de naissance",
  npi: "NPI",
  typeDemande: "Type de demande",
  typePasseport: "Type de passeport",
  nombreCopies: "Nombre de copies",
  usage: "Usage",
  motif: "Motif",
  typeDeclaration: "Type de déclaration",
  revenuAnnuel: "Revenu annuel",
  categorieVehicule: "Catégorie du véhicule",
  puissanceFiscale: "Puissance fiscale",
  typeVehicule: "Type de véhicule",
  immatriculation: "Immatriculation",
  centre: "Centre de visite",
  numeroFacture: "Numéro de facture",
  montantFacture: "Montant de la facture",
}

const PAYMENT_STATUS_LABELS = {
  EN_ATTENTE: "En attente",
  REUSSI: "Confirmé",
  ECHOUE: "Échoué",
} as const

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

export default async function AdminDossierPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  const token = await requireAdmin()

  const dossier = await apiFetch<AdminDossierDTO>(
    `/admin/dossiers/${encodeURIComponent(reference)}`,
    { token },
  ).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <IconArrowLeft size={14} aria-hidden="true" /> Retour à la file
        </Link>
        <span className="font-mono text-[11px] text-muted-foreground">
          {dossier.reference}
        </span>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ServiceIcon icon={dossier.service.icon} size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{dossier.service.name}</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Déposé le {formatDateTime(dossier.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={dossier.status} />
          {dossier.manualOverride && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Manuel
            </span>
          )}
          <span className="text-xs font-semibold">{formatFcfa(dossier.totalAmount)}</span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold">
              <IconUser size={15} className="text-primary" aria-hidden="true" /> Demandeur
            </h2>
            <dl className="mt-3 space-y-1.5 text-xs">
              <InfoRow
                label="Nom complet"
                value={`${dossier.user.firstName} ${dossier.user.lastName}`}
              />
              <InfoRow label="NPI" value={<span className="font-mono">{dossier.user.npi}</span>} />
              <InfoRow label="Naissance" value={formatDate(dossier.user.birthDate)} />
              <InfoRow label="Lieu de naissance" value={dossier.user.birthPlace} />
              <InfoRow
                label="Téléphone"
                value={
                  dossier.user.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <IconPhone size={12} aria-hidden="true" /> {dossier.user.phone}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-xs font-semibold">Formulaire transmis</h2>
            <dl className="mt-3 space-y-1.5 text-xs">
              {Object.entries(dossier.formData).map(([key, value]) => (
                <InfoRow key={key} label={labelFor(key)} value={value} />
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-xs font-semibold">Historique</h2>
            <ol className="mt-3 space-y-3">
              {dossier.events.map((event) => (
                <li key={`${event.status}-${event.createdAt}`} className="flex gap-3">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium">{STATUS_META[event.status].label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {event.message} · {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <StatusForm
            reference={dossier.reference}
            nextStatuses={dossier.nextStatuses.map((status) => ({
              value: status,
              label: STATUS_META[status].label,
            }))}
          />

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold">
              <IconReceipt2 size={15} className="text-primary" aria-hidden="true" /> Paiement
            </h2>

            {dossier.payment ? (
              <dl className="mt-3 space-y-1.5 text-xs">
                <InfoRow
                  label="Opérateur"
                  value={PAYMENT_PROVIDER_META[dossier.payment.provider].label}
                />
                <InfoRow label="Numéro" value={dossier.payment.phone} />
                <InfoRow label="Statut" value={PAYMENT_STATUS_LABELS[dossier.payment.status]} />
                <InfoRow
                  label="Reçu"
                  value={<span className="font-mono text-[11px]">{dossier.payment.receipt}</span>}
                />
                <InfoRow
                  label="Payé le"
                  value={
                    dossier.payment.paidAt ? formatDateTime(dossier.payment.paidAt) : "—"
                  }
                />
              </dl>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Aucun paiement enregistré pour ce dossier.
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold">
              <IconMapPin size={15} className="text-primary" aria-hidden="true" /> Retrait
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {dossier.pickupLocation}
            </p>
            {dossier.readyAt && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Prêt depuis le {formatDateTime(dossier.readyAt)}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
