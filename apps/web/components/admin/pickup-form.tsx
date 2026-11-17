"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconQrcode, IconLoader2, IconCheck } from "@tabler/icons-react"

import { adminCollectAction } from "@/lib/admin-actions"

export function PickupForm({
  reference,
  procurationCode,
  disabled,
}: {
  reference: string
  procurationCode: string | null
  disabled: boolean
}) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [target, setTarget] = useState<"DOSSIER" | "PROCURATION">("DOSSIER")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(null)

    const result = await adminCollectAction(reference, code, target)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSuccess("Retrait validé. Le citoyen a été notifié.")
    setCode("")
    router.refresh()
  }

  if (disabled) {
    return (
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold">
          <IconQrcode size={15} className="text-primary" aria-hidden="true" /> Retrait
        </h2>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Le dossier doit être « prêt à récupérer » pour valider un retrait.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold">
        <IconQrcode size={15} className="text-primary" aria-hidden="true" /> Valider le retrait
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Scanne le QR ou saisis le code à 6 chiffres du citoyen (ou de la procuration).
      </p>

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => setTarget("DOSSIER")}
          aria-pressed={target === "DOSSIER"}
          className={
            target === "DOSSIER"
              ? "rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
              : "rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
          }
        >
          Citoyen
        </button>
        <button
          type="button"
          onClick={() => setTarget("PROCURATION")}
          aria-pressed={target === "PROCURATION"}
          className={
            target === "PROCURATION"
              ? "rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
              : "rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
          }
        >
          Procuration
        </button>
      </div>

      <form onSubmit={submit} className="mt-2 space-y-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Code à 6 chiffres"
          aria-label="Code de retrait"
          className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm tracking-[0.3em] outline-none transition focus:border-primary"
        />

        {target === "PROCURATION" && procurationCode && (
          <p className="text-[10px] text-muted-foreground">
            Code procuration attendu : <span className="font-mono font-semibold">{procurationCode}</span>
          </p>
        )}

        <a href="/admin/scan" className="block text-[10px] font-medium text-primary hover:underline">
          Ouvrir le scanner QR caméra
        </a>

        {error && <p className="text-[11px] text-destructive">{error}</p>}
        {success && (
          <p className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
            <IconCheck size={13} aria-hidden="true" /> {success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending && <IconLoader2 size={13} className="animate-spin" aria-hidden="true" />}
          Valider la remise
        </button>
      </form>
    </section>
  )
}
