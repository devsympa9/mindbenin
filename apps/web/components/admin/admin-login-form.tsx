"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconLoader2, IconLock } from "@tabler/icons-react"

import { adminLoginAction } from "@/lib/admin-actions"

export function AdminLoginForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await adminLoginAction(code)

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    router.replace("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <label className="block">
        <span className="text-[11px] font-medium text-muted-foreground">
          Code administrateur
        </span>
        <div className="relative mt-1">
          <IconLock
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            placeholder="••••••••"
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
          />
        </div>
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {pending && <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />}
        Accéder au back-office
      </button>

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Espace réservé aux agents MindBenin. Le code est défini par{" "}
        <span className="font-mono">ADMIN_ACCESS_CODE</span>.
      </p>
    </form>
  )
}
