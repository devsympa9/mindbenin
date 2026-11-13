import { cn } from "@workspace/ui/lib/utils"

import { initials } from "@/lib/format"

const PALETTES = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-300",
]

const SIZES = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-lg",
} as const

function paletteFor(seed: string): string {
  const total = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return PALETTES[total % PALETTES.length]!
}

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string
  lastName: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        SIZES[size],
        paletteFor(`${firstName}${lastName}`),
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  )
}
