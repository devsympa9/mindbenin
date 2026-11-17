"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconArrowRight, IconMicrophone } from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

import { latestDossierAction } from "@/lib/actions"
import { formatFcfa } from "@/lib/format"
import { getLocale, phrase, SPEECH_LANG, statusLabel } from "@/lib/i18n"
import { speak } from "@/lib/speech"
import {
  COMMANDS,
  detailLabel,
  extractDetails,
  isStatusQuery,
  matchCommand,
  type VoiceIntent,
} from "@/lib/voice-intent"

import { VoiceRepliesToggle } from "./voice-replies"

type SpeechResult = { 0?: { transcript?: string } }

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export function VoiceCommand() {
  const router = useRouter()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [manual, setManual] = useState("")
  const [pendingCommand, setPendingCommand] = useState<VoiceIntent | null>(null)

  function announce(text: string) {
    const locale = getLocale()
    setMessage(text)
    speak(text, { lang: SPEECH_LANG[locale] })
  }

  /** « Où est mon dossier ? » : lit le dernier dossier à voix haute. */
  async function answerStatus() {
    const locale = getLocale()
    const result = await latestDossierAction()

    if (!result.ok || !result.data) {
      announce(phrase(locale, "notFound"))
      return
    }

    const dossier = result.data
    announce(
      `${dossier.service.name}. ${phrase(locale, "statusUpdated", {
        reference: dossier.reference.replace(/-/g, " "),
        status: statusLabel(locale, dossier.status),
      })} ${formatFcfa(dossier.totalAmount)}.`,
    )
  }

  function navigate(slug: string, label: string, details: Record<string, string> = {}) {
    const params = new URLSearchParams(details)
    const query = params.toString()
    announce(
      Object.keys(details).length > 0
        ? `Je lance ${label} avec les informations détectées.`
        : `Je lance ${label}.`,
    )
    window.setTimeout(
      () => router.push(`/app/services/${slug}${query ? `?${query}` : ""}`),
      900,
    )
  }

  function startListening() {
    setMessage(null)
    setTranscript("")

    const globalWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition

    if (!Recognition) {
      announce(
        "La reconnaissance vocale n'est pas disponible ici. Écris ta demande ci-dessous.",
      )
      return
    }

    let finalTranscript = ""
    const recognition = new Recognition()
    recognition.lang = "fr-FR"
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_, index) => {
        return event.results[index]?.[0]?.transcript ?? ""
      }).join(" ")

      setTranscript(text)
      finalTranscript = text
    }

    recognition.onend = () => {
      setListening(false)

      if (isStatusQuery(finalTranscript)) {
        void answerStatus()
        return
      }

      const command = matchCommand(finalTranscript)
      if (command) {
        const details = extractDetails(command.slug, finalTranscript)
        setPendingCommand({ slug: command.slug, label: command.label, details })

        const detected = Object.entries(details)
          .map(([key, value]) => `${detailLabel(key)} : ${value}`)
          .join(". ")

        announce(
          detected
            ? `J'ai compris : ${command.label}. ${detected}. Confirme ou annule.`
            : `J'ai compris : ${command.label}. Confirme ou annule.`,
        )
      } else if (finalTranscript.trim()) {
        announce(
          "Je n'ai pas reconnu. Essaie « passeport », « TVM », « visite technique », « facture SONEB », « acte de célibat » ou « cotisation CNSS ».",
        )
      }
    }

    recognition.onerror = () => {
      setListening(false)
      announce("Micro indisponible. Tu peux écrire ta demande.")
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      announce("Le micro est déjà en écoute. Réessaie dans un instant.")
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (isStatusQuery(manual)) {
      void answerStatus()
      return
    }

    const command = matchCommand(manual)

    if (!command) {
      announce(
        "Je n'ai pas reconnu. Essaie « passeport », « TVM », « visite technique », « facture SONEB », « acte de célibat » ou « cotisation CNSS ».",
      )
      return
    }

    navigate(command.slug, command.label, extractDetails(command.slug, manual))
  }

  return (
    <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Que veux-tu faire ?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Parle, MindBenin remplit et paie pour toi.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          IA vocale
        </span>
      </div>

      <VoiceRepliesToggle className="mt-2" />

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={startListening}
          aria-label="Parler à MindBenin"
          className={cn(
            "relative grid size-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95",
            listening && "animate-[mb-pulse_1.6s_ease-out_infinite]",
          )}
        >
          <IconMicrophone size={26} aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-black">
            FR
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {transcript || (listening ? "Je t'écoute…" : "Dis « Je veux mon passeport »")}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {message ?? "Français, fon, yoruba — simulé dans cette démo."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {COMMANDS.map((command) => (
          <button
            key={command.slug}
            type="button"
            onClick={() => router.push(`/app/services/${command.slug}`)}
            className="rounded-full border bg-background px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/40 hover:text-primary"
          >
            {command.label}
          </button>
        ))}
      </div>

      {pendingCommand && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigate(pendingCommand.slug, pendingCommand.label, pendingCommand.details)
              setPendingCommand(null)
            }}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingCommand(null)
              announce("Annulé. Dis-moi ce que tu veux faire.")
            }}
            className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary/40"
          >
            Annuler
          </button>
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Ou écris ta demande…"
          aria-label="Écrire une demande"
          className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs outline-none transition focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Envoyer la demande"
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          <IconArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}
