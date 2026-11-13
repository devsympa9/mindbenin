"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconArrowRight, IconLoader2, IconShieldCheck } from "@tabler/icons-react"

import { createDossierAction } from "@/lib/actions"
import { formatDate, formatFcfa } from "@/lib/format"
import type { ServiceDTO, UserDTO } from "@/lib/types"

export function ServiceForm({
  service,
  user,
  initialValues,
}: {
  service: ServiceDTO
  user: UserDTO
  initialValues?: Record<string, string>
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base = Object.fromEntries(
      service.fields.map((field) => [
        field.name,
        field.type === "select" ? (field.options?.[0] ?? "") : "",
      ]),
    )

    if (initialValues) {
      for (const field of service.fields) {
        const value = initialValues[field.name]
        if (!value) continue
        if (field.type === "select") {
          if (field.options?.includes(value)) base[field.name] = value
        } else {
          base[field.name] = value
        }
      }
    }

    return base
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const billAmount = service.amountField
    ? Number((values[service.amountField] ?? "").replace(/[^0-9]/g, ""))
    : 0

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await createDossierAction(service.slug, values)

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push(`/app/dossiers/${result.data.reference}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <IconShieldCheck size={16} className="text-primary" aria-hidden="true" />
          <h2 className="text-xs font-semibold">Pré-rempli depuis ton NPI</h2>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <dt className="text-muted-foreground">Nom complet</dt>
            <dd className="mt-0.5 font-medium">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <dt className="text-muted-foreground">Date de naissance</dt>
            <dd className="mt-0.5 font-medium">{formatDate(user.birthDate)}</dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <dt className="text-muted-foreground">NPI</dt>
            <dd className="mt-0.5 font-mono font-medium">{user.npi}</dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-2.5">
            <dt className="text-muted-foreground">Lieu de naissance</dt>
            <dd className="mt-0.5 font-medium">{user.birthPlace}</dd>
          </div>
        </dl>
      </section>

      {initialValues && Object.keys(initialValues).length > 0 && (
        <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
          Champs pré-remplis depuis ta commande vocale. Vérifie avant de valider.
        </p>
      )}

      {service.fields.length > 0 && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="text-xs font-semibold">Informations complémentaires</h2>

          {service.fields.map((field) => (
            <label key={field.name} className="block">
              <span className="text-[11px] font-medium text-muted-foreground">{field.label}</span>

              {field.type === "select" ? (
                <select
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
                />
              )}
            </label>
          ))}
        </section>
      )}

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-xs font-semibold">Détail du prix</h2>

        <dl className="mt-3 space-y-1.5 text-xs">
          {service.amountField ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Montant de ta facture</dt>
                <dd className="font-medium">
                  {billAmount > 0 ? formatFcfa(billAmount) : "À saisir"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Frais de confort MindBenin</dt>
                <dd className="font-medium">{formatFcfa(service.commission)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 text-sm font-semibold">
                <dt>Total</dt>
                <dd>
                  {billAmount > 0
                    ? formatFcfa(billAmount + service.commission)
                    : `Montant + ${formatFcfa(service.commission)}`}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Frais officiels {service.shortName.toLowerCase()}
                </dt>
                <dd className="font-medium">{formatFcfa(service.officialPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Frais de confort MindBenin</dt>
                <dd className="font-medium">{formatFcfa(service.commission)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 text-sm font-semibold">
                <dt>Total</dt>
                <dd>{formatFcfa(service.officialPrice + service.commission)}</dd>
              </div>
            </>
          )}
        </dl>

        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Le paiement mobile money se fait à l&apos;étape suivante. Le prestataire ne prend aucune
          commission sur les frais officiels.
        </p>
      </section>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? (
          <IconLoader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <IconArrowRight size={18} aria-hidden="true" />
        )}
        Créer mon dossier
      </button>
    </form>
  )
}
