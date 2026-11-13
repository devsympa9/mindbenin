import Link from "next/link"

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <span className="text-sm font-bold tracking-tight">M</span>
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-background" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">MindBenin</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Think &amp; Go
        </span>
      </span>
    </Link>
  )
}
