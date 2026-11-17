import { QrScanner } from "@/components/admin/qr-scanner"
import { requireAdmin } from "@/lib/admin"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Scanner un QR de retrait",
}

export default async function AdminScanPage() {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Scanner un retrait</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Contrôle du QR, puis remise du document au citoyen ou à son mandataire.
        </p>
      </header>

      <QrScanner />
    </div>
  )
}
