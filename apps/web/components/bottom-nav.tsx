"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconFiles, IconHome } from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

const ITEMS = [
  { href: "/app", label: "Accueil", icon: IconHome, exact: true },
  { href: "/app/dossiers", label: "Mes dossiers", icon: IconFiles, exact: false },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={20} stroke={active ? 2 : 1.6} aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
