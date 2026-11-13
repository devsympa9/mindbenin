import Link from "next/link"
import { IconExternalLink, IconLogout } from "@tabler/icons-react"

import { Brand } from "@/components/brand"
import { requireAdmin } from "@/lib/admin"
import { adminLogoutAction } from "@/lib/admin-actions"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-svh bg-secondary/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Brand href="/admin" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Administration
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Site citoyen <IconExternalLink size={14} aria-hidden="true" />
            </Link>
            <form action={adminLogoutAction}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <IconLogout size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
