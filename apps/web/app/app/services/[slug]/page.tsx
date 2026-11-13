import Link from "next/link"
import { notFound } from "next/navigation"
import { IconArrowLeft, IconClock, IconMapPin } from "@tabler/icons-react"

import { ServiceForm } from "@/components/service-form"
import { ServiceIcon } from "@/components/service-icon"
import { ApiError, apiFetch } from "@/lib/api"
import { requireUser } from "@/lib/session"
import type { ServiceDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await requireUser()

  const service = await apiFetch<ServiceDTO>(`/services/${slug}`).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  })

  return (
    <div className="space-y-5">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <IconArrowLeft size={14} aria-hidden="true" /> Accueil
      </Link>

      <header className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ServiceIcon icon={service.icon} size={26} />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">{service.name}</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">
            <IconClock size={12} aria-hidden="true" /> {service.processingDays} jours
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium">
            <IconMapPin size={12} aria-hidden="true" /> Retrait sur place
          </span>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-xs font-semibold">Ce qu&apos;il faut</h2>
        <ul className="mt-2 space-y-1.5">
          {service.requirements.map((requirement) => (
            <li key={requirement} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              {requirement}
            </li>
          ))}
        </ul>
      </section>

      <ServiceForm service={service} user={user} />
    </div>
  )
}
