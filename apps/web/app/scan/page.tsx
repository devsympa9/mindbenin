import type { Metadata } from "next"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"

import { Brand } from "@/components/brand"
import { ScanFlow } from "@/components/scan-flow"

export const metadata: Metadata = {
  title: "Vérification d'identité",
}

export default function ScanPage() {
  return (
    <div className="min-h-svh bg-secondary/30">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background shadow-xl">
        <header className="flex items-center justify-between px-4 py-3">
          <Brand />
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <IconArrowLeft size={14} aria-hidden="true" /> Accueil
          </Link>
        </header>
        <main className="flex-1 px-4 pb-8 pt-2">
          <ScanFlow />
        </main>
      </div>
    </div>
  )
}
