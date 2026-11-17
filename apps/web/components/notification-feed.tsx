"use client"

import { useCallback, useEffect, useState } from "react"
import { IconBell, IconBrandWhatsapp, IconMessage } from "@tabler/icons-react"

import { markNotificationsReadAction, notificationsAction } from "@/lib/actions"
import { formatDateTime } from "@/lib/format"
import type { NotificationDTO } from "@/lib/types"

const STATUS_STYLES: Record<NotificationDTO["status"], string> = {
  ENVOYE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  SIMULE: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  EN_ATTENTE: "bg-secondary text-muted-foreground",
  ECHEC: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
}

const STATUS_LABELS: Record<NotificationDTO["status"], string> = {
  ENVOYE: "envoyé",
  SIMULE: "journal",
  EN_ATTENTE: "en attente",
  ECHEC: "échec",
}

export function NotificationFeed() {
  const [items, setItems] = useState<NotificationDTO[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const result = await notificationsAction()
    if (result.ok) setItems(result.data)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const unread = items.filter((item) => !item.readAt).length

  async function toggle() {
    const next = !open
    setOpen(next)

    if (next && unread > 0) {
      await markNotificationsReadAction()
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    }
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex w-full items-center gap-2 p-3.5 text-left"
      >
        <span className="relative grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <IconBell size={16} aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold">Notifications</span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {items[0]?.title}
          </span>
        </span>
        <span className="text-[10px] text-muted-foreground">{open ? "Masquer" : "Voir"}</span>
      </button>

      {open && (
        <ul className="max-h-72 space-y-2 overflow-y-auto border-t p-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl bg-secondary/60 p-2.5">
              <div className="flex items-center gap-1.5">
                {item.channel === "WHATSAPP" ? (
                  <IconBrandWhatsapp size={12} className="text-emerald-600" aria-hidden="true" />
                ) : (
                  <IconMessage size={12} className="text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                  {item.title}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ${STATUS_STYLES[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-[9px] text-muted-foreground">
                {item.recipient} · {formatDateTime(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
