import { IconLogout } from "@tabler/icons-react"

import { logoutAction } from "@/lib/actions"
import { requireUser } from "@/lib/session"

import { Avatar } from "@/components/avatar"
import { BottomNav } from "@/components/bottom-nav"
import { Brand } from "@/components/brand"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="min-h-svh bg-secondary/30">
      <div className="relative mx-auto flex min-h-svh w-full max-w-md flex-col bg-background shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
          <Brand href="/app" />

          <div className="flex items-center gap-2">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Se déconnecter"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <IconLogout size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      </div>

      <BottomNav />
    </div>
  )
}
