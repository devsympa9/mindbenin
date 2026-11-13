import { cn } from "@workspace/ui/lib/utils"

import { STATUS_META, type DossierStatusValue } from "@/lib/status"

const TONES = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  progress: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  danger: "bg-destructive/10 text-destructive",
} as const

export function StatusPill({
  status,
  className,
}: {
  status: DossierStatusValue
  className?: string
}) {
  const meta = STATUS_META[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        TONES[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
