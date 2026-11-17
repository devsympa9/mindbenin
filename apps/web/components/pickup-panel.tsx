"use client"

import { useCallback, useEffect, useState } from "react"
import {
  IconCopy,
  IconId,
  IconLoader2,
  IconLock,
  IconQrcode,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react"

import {
  createProcurationAction,
  getPickupAction,
  revokeProcurationAction,
} from "@/lib/actions"
import { getLocale, SPEECH_LANG } from "@/lib/i18n"
import { speak } from "@/lib/speech"
import type { DossierDTO, PickupDTO } from "@/lib/types"

export function PickupPanel({ dossier }: { dossier: DossierDTO }) {
  const [pickup, setPickup] = useState<PickupDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [values, setValues] = useState({
    holderName: "",
    holderPhone: "",
    holderIdNumber: "",
  })

  const load = useCallback(async () => {
    const result = await getPickupAction(dossier.reference)

    if (result.ok) {
      setPickup(result.data)
      setError(null)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }, [dossier.reference])

  useEffect(() => {
    void load()
  }, [load, dossier.status])

  function announce(text: string) {
    speak(text, { force: true, lang: SPEECH_LANG[getLocale()] })
  }

  async function copyCode() {
    if (!pickup?.code) return

    try {
      await navigator.clipboard.writeText(pickup.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      announce("Copie impossible sur ce navigateur.")
    }
  }

  async function submitProcuration(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await createProcurationAction(dossier.reference, values)

    if (!result.ok) {
      setError(result.error)
      announce(result.error)
      setPending(false)
      return
    }

    setPending(false)
    setFormOpen(false)
    setValues({ holderName: "", holderPhone: "", holderIdNumber: "" })
    announce("Procuration enregistrée. Ton mandataire peut retirer le document.")
    await load()
  }

  async function revoke() {
    const result = await revokeProcurationAction(dossier.reference)

    if (!result.ok) {
      setError(result.error)
      return
    }

    announce("Procuration annulée.")
    await load()
  }

  if (loading) {
    return (
      <section className="grid place-items-center rounded-2xl border bg-card p-6">
        <IconLoader2 size={18} className="animate-spin text-muted-foreground" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <IconQrcode size={16} className="text-primary" aria-hidden="true" />
        Retrait du document
      </div>

      <div className="mt-3 flex gap-3">
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-1">
          {pickup?.qrSvg && pickup.available ? (
            <div
              aria-label="QR code de retrait"
              className="[&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: pickup.qrSvg }}
            />
          ) : (
            <IconLock size={28} className="text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">
            {pickup?.available
              ? "Présente ce QR au guichet. Il est aussi vérifiable avec le code à 6 chiffres."
              : "Le QR et le code s'activent dès que ton dossier est prêt. Rien à présenter avant."}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-[0.2em]">
              {pickup?.code || "—"}
            </span>
            {pickup?.code && (
              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition hover:border-primary/40 hover:text-primary"
              >
                <IconCopy size={12} aria-hidden="true" /> {copied ? "Copié" : "Copier"}
              </button>
            )}
          </div>
        </div>
      </div>

      {pickup?.collectedAt && (
        <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
          Document retiré le {new Date(pickup.collectedAt).toLocaleString("fr-FR")}.
        </p>
      )}

      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <IconId size={14} className="text-primary" aria-hidden="true" />
            Procuration
          </div>
          {pickup?.procuration?.active ? (
            <button
              type="button"
              onClick={() => void revoke()}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive transition hover:underline"
            >
              <IconX size={12} aria-hidden="true" /> Annuler
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen((open) => !open)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition hover:underline"
            >
              <IconUserPlus size={12} aria-hidden="true" />
              {formOpen ? "Fermer" : "Désigner quelqu'un"}
            </button>
          )}
        </div>

        {pickup?.procuration?.active ? (
          <div className="mt-2 rounded-xl bg-secondary/60 p-2.5 text-[11px]">
            <p className="font-medium">{pickup.procuration.holderName}</p>
            <p className="text-muted-foreground">
              {pickup.procuration.holderPhone} · pièce {pickup.procuration.holderIdNumber}
            </p>
            <p className="mt-1 text-muted-foreground">
              Code mandataire :{" "}
              <span className="font-mono font-semibold text-foreground">
                {pickup.procuration.code || "disponible au retrait"}
              </span>
            </p>
          </div>
        ) : formOpen ? (
          <form onSubmit={submitProcuration} className="mt-2 space-y-2">
            <input
              value={values.holderName}
              onChange={(event) =>
                setValues((current) => ({ ...current, holderName: event.target.value }))
              }
              placeholder="Nom complet du mandataire"
              required
              className="h-9 w-full rounded-lg border bg-background px-2.5 text-[11px] outline-none focus:border-primary"
            />
            <input
              value={values.holderPhone}
              onChange={(event) =>
                setValues((current) => ({ ...current, holderPhone: event.target.value }))
              }
              placeholder="Téléphone (01 XX XX XX XX)"
              required
              inputMode="numeric"
              className="h-9 w-full rounded-lg border bg-background px-2.5 text-[11px] outline-none focus:border-primary"
            />
            <input
              value={values.holderIdNumber}
              onChange={(event) =>
                setValues((current) => ({ ...current, holderIdNumber: event.target.value }))
              }
              placeholder="Numéro de pièce d'identité"
              required
              className="h-9 w-full rounded-lg border bg-background px-2.5 text-[11px] outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {pending && (
                <IconLoader2 size={13} className="animate-spin" aria-hidden="true" />
              )}
              Enregistrer la procuration
            </button>
          </form>
        ) : (
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Empêché ? Désigne une personne de confiance : elle retirera le document avec son code.
          </p>
        )}
      </div>

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </section>
  )
}
