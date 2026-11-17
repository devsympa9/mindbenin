"use client"

import { useEffect, useState } from "react"
import { IconVolume, IconVolumeOff } from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

import {
  isVoiceReplyEnabled,
  setVoiceReplyEnabled,
  speak,
  speechSupported,
} from "@/lib/speech"

export function VoiceRepliesToggle({ className }: { className?: string }) {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setSupported(speechSupported())
    setEnabled(isVoiceReplyEnabled())
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Couper la voix de MindBenin" : "Activer la voix de MindBenin"}
      onClick={() => {
        const next = !enabled
        setVoiceReplyEnabled(next)
        setEnabled(next)
        if (next) speak("Voix activée.", { force: true })
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[10px] font-medium transition hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      {enabled ? (
        <IconVolume size={12} aria-hidden="true" />
      ) : (
        <IconVolumeOff size={12} aria-hidden="true" />
      )}
      {enabled ? "Voix activée" : "Voix coupée"}
    </button>
  )
}

export function SpeakButton({
  text,
  label = "Écouter",
  className,
}: {
  text: string
  label?: string
  className?: string
}) {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(speechSupported())
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={() => speak(text, { force: true })}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[10px] font-medium transition hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      <IconVolume size={12} aria-hidden="true" />
      {label}
    </button>
  )
}
