"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { IconCheck, IconLoader2 } from "@tabler/icons-react"

import { adminUpdateStatusAction } from "@/lib/admin-actions"
import type { DossierStatusValue } from "@/lib/status"

type NextStatus = { value: DossierStatusValue; label: string }

export function StatusForm({
  reference,
  nextStatuses,
}: {
  reference: string
  nextStatuses: NextStatus[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(nextStatuses[0]?.value ?? "")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!nextStatuses.some((option) => option.value === status)) {
      setStatus(nextStatuses[0]?.value ?? "")
    }
  }, [nextStatuses, status])

  if (nextStatuses.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-xs font-semibold">Traitement</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Dossier clôturé : aucune action supplémentaire n&apos;est possible.
        </p>
      </section>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!status) {
      return
    }

    setPending(true)
    setError(null)
    setSuccess(null)

    const result = await adminUpdateStatusAction(reference, status, message)

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const label = nextStatuses.find((option) => option.value === status)?.label ?? status
    setSuccess(`Dossier mis à jour : ${label}.`)
    setMessage("")
    router.refresh()
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-xs font-semibold">Traitement</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Fais avancer le dossier. L&apos;avancement automatique de la démo est désactivé dès
        qu&apos;un agent intervient.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">
            Nouveau statut
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
          >
            {nextStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">
            Note pour le citoyen (facultatif)
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ex. Document disponible au guichet 3."
            className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && (
          <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <IconCheck size={14} aria-hidden="true" /> {success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {pending && <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />}
          Mettre à jour le dossier
        </button>
      </form>
    </section>
  )
}
