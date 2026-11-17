"use client"

import { useEffect, useState } from "react"

import { LOCALES, LOCALE_EVENT, getLocale, setLocale, type Locale } from "@/lib/i18n"

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const [locale, setCurrent] = useState<Locale>("fr")

  useEffect(() => {
    setCurrent(getLocale())

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail
      if (detail) setCurrent(detail)
    }

    window.addEventListener(LOCALE_EVENT, handler)
    return () => window.removeEventListener(LOCALE_EVENT, handler)
  }, [])

  return (
    <div
      role="group"
      aria-label="Langue des réponses vocales"
      className={`inline-flex items-center gap-0.5 rounded-full border bg-background p-0.5 ${className}`}
    >
      {LOCALES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocale(option.value)}
          aria-pressed={locale === option.value}
          title={option.label}
          className={
            locale === option.value
              ? "rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground"
              : "rounded-full px-2 py-0.5 text-[9px] font-medium text-muted-foreground transition hover:text-foreground"
          }
        >
          {option.hint}
        </button>
      ))}
    </div>
  )
}
