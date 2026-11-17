"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconBellRinging, IconLoader2, IconRefresh } from "@tabler/icons-react"

import { adminRetryNotificationsAction, adminRunRemindersAction } from "@/lib/admin-actions"

export function AdminTools() {
  const router = useRouter()
  const [pending, setPending] = useState<"reminders" | "retry" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: "reminders" | "retry") {
    setPending(kind)
    setError(null)
    setMessage(null)

    const result =
      kind === "reminders" ? await adminRunRemindersAction() : await adminRetryNotificationsAction()

    setPending(null)

    if (!result.ok) {
      setError(result.error)
      return
    }

    if (kind === "reminders") {
      const data = result.data as { candidates: number; sent: number }
      setMessage(
        `${data.sent} relance${data.sent > 1 ? "s" : ""} envoyée${data.sent > 1 ? "s" : ""} sur ${data.candidates} dossier${data.candidates > 1 ? "s" : ""} en attente de paiement.`,
      )
    } else {
      const data = result.data as { retried: number }
      setMessage(`${data.retried} notification${data.retried > 1 ? "s" : ""} retentée${data.retried > 1 ? "s" : ""}.`)
    }

    router.refresh()
  }

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run("reminders")}
          disabled={pending !== null}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {pending === "reminders" ? (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <IconBellRinging size={14} aria-hidden="true" />
          )}
          Lancer les rappels de paiement
        </button>

        <button
          type="button"
          onClick={() => void run("retry")}
          disabled={pending !== null}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {pending === "retry" ? (
            <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <IconRefresh size={14} aria-hidden="true" />
          )}
          Réessayer les envois en échec
        </button>
      </div>

      {message && <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
