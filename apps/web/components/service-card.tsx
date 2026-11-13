import Link from "next/link"
import { IconChevronRight } from "@tabler/icons-react"

import { formatFcfa } from "@/lib/format"
import type { ServiceDTO } from "@/lib/types"

import { ServiceIcon } from "./service-icon"

export function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <Link
      href={`/app/services/${service.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <ServiceIcon icon={service.icon} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{service.shortName}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {service.amountField
            ? `Montant + ${formatFcfa(service.commission)}`
            : formatFcfa(service.officialPrice + service.commission)}
        </span>
      </span>
      <span className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{service.processingDays} j</span>
        <IconChevronRight
          size={14}
          className="transition group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </span>
    </Link>
  )
}
