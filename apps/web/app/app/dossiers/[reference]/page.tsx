import { notFound } from "next/navigation"

import { DossierView } from "@/components/dossier-view"
import { ApiError, apiFetch } from "@/lib/api"
import { requireUser } from "@/lib/session"
import type { DossierDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DossierPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params
  await requireUser()

  const dossier = await apiFetch<DossierDTO>(`/dossiers/${reference}`).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  })

  return <DossierView initial={dossier} />
}
