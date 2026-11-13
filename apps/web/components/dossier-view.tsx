"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  IconArrowLeft,
  IconBell,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconDeviceMobile,
  IconLoader2,
  IconMapPin,
  IconReceipt2,
} from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

import { getDossierAction, payDossierAction } from "@/lib/actions"
import { formatDateTime, formatFcfa } from "@/lib/format"
import {
  PAYMENT_PROVIDER_META,
  STATUS_META,
  TRACKING_STEPS,
  isFinalStatus,
  statusProgress,
  stepIndex,
  type PaymentProviderValue,
} from "@/lib/status"
import type { DossierDTO } from "@/lib/types"

import { ServiceIcon } from "./service-icon"
import { StatusPill } from "./status-pill"

const PROVIDERS: PaymentProviderValue[] = ["MTN_MOMO", "MOOV_MONEY"]

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

function labelFor(key: string): string {
  if (FIELD_LABELS[key]) {
    return FIELD_LABELS[key]
  }

  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function DossierView({ initial }: { initial: DossierDTO }) {
  const [dossier, setDossier] = useState<DossierDTO>(initial)
  const [provider, setProvider] = useState<PaymentProviderValue>("MTN_MOMO")
  const [phone, setPhone] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paid = Boolean(dossier.payment?.paidAt)
  const pendingPayment = Boolean(dossier.payment && !dossier.payment.paidAt)
  const final = isFinalStatus(dossier.status)
  const activeIndex = stepIndex(dossier.status)
  const progress = statusProgress(dossier.status)

  const refresh = useCallback(async () => {
    const result = await getDossierAction(dossier.reference)

    if (result.ok) {
      setDossier(result.data)
    }
  }, [dossier.reference])

  useEffect(() => {
    if (final || (!paid && !pendingPayment)) {
      return
    }

    const interval = window.setInterval(() => {
      void refresh()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [paid, pendingPayment, final, refresh])

  async function handlePay(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await payDossierAction(dossier.reference, provider, phone)

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    setDossier(result.data)
    setPending(false)

    const checkoutUrl = result.data.payment?.checkoutUrl

    if (checkoutUrl && !result.data.payment?.paidAt) {
      window.location.assign(checkoutUrl)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/app/dossiers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <IconArrowLeft size={14} aria-hidden="true" /> Mes dossiers
        </Link>
        <span className="font-mono text-[11px] text-muted-foreground">{dossier.reference}</span>
      </div>

      <header className="flex items-start gap-3 rounded-2xl border bg-card p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ServiceIcon icon={dossier.service.icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">{dossier.service.name}</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Créé le {formatDateTime(dossier.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={dossier.status} />
            <span className="text-[11px] font-medium">{formatFcfa(dossier.totalAmount)}</span>
          </div>
        </div>
      </header>

      {!paid && pendingPayment ? (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IconClock size={16} aria-hidden="true" /> Paiement en attente
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            Termine le paiement sur la page sécurisée FedaPay. Dès que l&apos;opérateur confirme,
            ton dossier passe automatiquement en traitement.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {dossier.payment?.checkoutUrl && (
              <a
                href={dossier.payment.checkoutUrl}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Reprendre le paiement FedaPay
              </a>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex h-10 items-center justify-center rounded-lg border border-amber-900/20 px-3 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-100/20 dark:hover:bg-amber-500/20"
            >
              Vérifier le statut
            </button>
          </div>

          {dossier.payment?.status === "ECHOUE" && (
            <p className="mt-2 text-[11px] font-medium">
              Le paiement a été refusé ou annulé : reprends le paiement pour réessayer.
            </p>
          )}
        </section>
      ) : !paid ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <IconCreditCard size={16} className="text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Paiement</h2>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              FedaPay
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choisis ton opérateur : MindBenin paie l&apos;administration pour toi.
          </p>

          <form onSubmit={handlePay} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setProvider(option)}
                  aria-pressed={provider === option}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    provider === option
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "inline-grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[10px] font-bold",
                      option === "MTN_MOMO"
                        ? "bg-amber-400 text-black"
                        : "bg-sky-600 text-white",
                    )}
                  >
                    {PAYMENT_PROVIDER_META[option].short}
                  </span>
                  <span className="mt-2 block text-xs font-medium">
                    {PAYMENT_PROVIDER_META[option].label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">Mobile money</span>
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-[11px] font-medium text-muted-foreground">
                Numéro {PAYMENT_PROVIDER_META[provider].label}
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01 97 12 34 56"
                className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <dl className="space-y-1.5 rounded-xl bg-secondary/60 p-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Frais officiels</dt>
                <dd>{formatFcfa(dossier.officialPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Frais MindBenin</dt>
                <dd>{formatFcfa(dossier.commission)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1.5 text-sm font-semibold">
                <dt>Total</dt>
                <dd>{formatFcfa(dossier.totalAmount)}</dd>
              </div>
            </dl>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? (
                <IconLoader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconDeviceMobile size={18} aria-hidden="true" />
              )}
              Payer {formatFcfa(dossier.totalAmount)}
            </button>

            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
              Paiement sécurisé par FedaPay (MTN MoMo · Moov Money). Sans clés API, le paiement
              est simulé immédiatement.
            </p>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Suivi du dossier</h2>
              {!final && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <IconLoader2 size={12} className="animate-spin" aria-hidden="true" />
                  Actualisation auto
                </span>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between">
              <p className="text-2xl font-semibold tracking-tight">{progress}%</p>
              <p className="text-xs text-muted-foreground">{STATUS_META[dossier.status].label}</p>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ol className="mt-5 space-y-4">
              {TRACKING_STEPS.map((step, index) => {
                const reached = activeIndex >= index
                const current = activeIndex === index && !final

                return (
                  <li key={step.status} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                        reached
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                        current && "ring-4 ring-primary/10",
                      )}
                    >
                      {reached ? <IconCheck size={13} aria-hidden="true" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-xs font-medium",
                          reached ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>

            {!final && (
              <p className="mt-4 rounded-lg bg-secondary/60 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
                Simulation : ton dossier avance automatiquement quelques secondes après le paiement
                (10 s, puis 25 s).
              </p>
            )}
          </section>

          {dossier.status === "PRET_A_RECUPERER" && (
            <section className="rounded-2xl bg-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <IconBell size={16} aria-hidden="true" /> Ton document est prêt
              </div>
              <p className="mt-2 text-sm font-semibold">{dossier.service.shortName}</p>
              <p className="mt-0.5 text-xs opacity-90">
                Présente-toi avec ton NPI {dossier.user.npi} pour le retrait.
              </p>
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <IconMapPin size={16} className="text-primary" aria-hidden="true" /> Lieu de retrait
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {dossier.pickupLocation}
            </p>
          </section>

          {dossier.payment && (
            <section className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <IconReceipt2 size={16} className="text-primary" aria-hidden="true" /> Reçu de
                paiement
              </div>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Opérateur</dt>
                  <dd className="font-medium">
                    {PAYMENT_PROVIDER_META[dossier.payment.provider].label}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Numéro</dt>
                  <dd className="font-medium">{dossier.payment.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Montant</dt>
                  <dd className="font-semibold">{formatFcfa(dossier.totalAmount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Reçu</dt>
                  <dd className="font-mono text-[11px]">{dossier.payment.receipt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Payé le</dt>
                  <dd>
                    {dossier.payment.paidAt ? formatDateTime(dossier.payment.paidAt) : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-xs font-semibold">Informations transmises</h2>
            <dl className="mt-3 space-y-1.5 text-xs">
              {Object.entries(dossier.formData).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{labelFor(key)}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
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
        </>
      )}
    </div>
  )
}
