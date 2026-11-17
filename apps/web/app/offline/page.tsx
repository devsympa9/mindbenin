import Link from "next/link"
import { IconWifiOff } from "@tabler/icons-react"

export const metadata = {
  title: "Hors ligne",
}

export default function OfflinePage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <IconWifiOff size={26} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Tu es hors ligne</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Les données de tes dossiers ne sont jamais mises en cache : elles restent privées. Reviens
          en ligne pour consulter un dossier, payer ou envoyer une pièce.
        </p>
        <Link
          href="/app"
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
        >
          Réessayer
        </Link>
      </div>
    </main>
  )
}
