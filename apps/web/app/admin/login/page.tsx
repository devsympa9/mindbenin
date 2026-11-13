import { IconShieldCheck } from "@tabler/icons-react"
import { redirect } from "next/navigation"

import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { Brand } from "@/components/brand"
import { getAdminToken } from "@/lib/admin"
import { apiFetch } from "@/lib/api"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Administration",
}

export default async function AdminLoginPage() {
  const token = await getAdminToken()
  let valid = false

  if (token) {
    try {
      await apiFetch<{ ok: boolean }>("/admin/session", { token })
      valid = true
    } catch {
      valid = false
    }
  }

  if (valid) {
    redirect("/admin")
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-secondary/40 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,theme(colors.primary/15),transparent_45%)]"
      />

      <div className="relative w-full max-w-sm rounded-3xl border bg-background p-6 shadow-xl">
        <Brand href="/" />

        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <IconShieldCheck size={13} aria-hidden="true" /> Back-office
        </span>

        <h1 className="mt-3 text-xl font-semibold tracking-tight">Espace administration</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Traite les dossiers, fais avancer les statuts et suis les encaissements.
        </p>

        <AdminLoginForm />
      </div>
    </main>
  )
}
