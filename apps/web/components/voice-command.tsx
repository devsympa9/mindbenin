"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconArrowRight, IconMicrophone } from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

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

const COMMANDS = [
  {
    slug: "passeport",
    label: "Passeport",
    keywords: ["passeport", "voyage", "biometrique"],
  },
  {
    slug: "acte-naissance",
    label: "Acte de naissance",
    keywords: ["acte", "naissance", "extrait", "mairie"],
  },
  {
    slug: "casier-judiciaire",
    label: "Casier judiciaire",
    keywords: ["casier", "judiciaire", "bulletin"],
  },
  {
    slug: "impots",
    label: "Impôts",
    keywords: ["impot", "taxe", "fiscal", "dgi", "declaration"],
  },
] as const

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function matchCommand(value: string) {
  const text = normalize(value)
  return COMMANDS.find((command) =>
    command.keywords.some((keyword) => text.includes(normalize(keyword))),
  )
}

export function VoiceCommand() {
  const router = useRouter()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [manual, setManual] = useState("")

  function navigate(slug: string, label: string) {
    setMessage(`Je lance : ${label}`)
    window.setTimeout(() => router.push(`/app/services/${slug}`), 500)
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
      setMessage(
        "La reconnaissance vocale n'est pas disponible ici. Écris ta demande ci-dessous.",
      )
      return
    }

    const recognition = new Recognition()
    recognition.lang = "fr-FR"
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length }, (_, index) => {
        return event.results[index]?.[0]?.transcript ?? ""
      }).join(" ")

      setTranscript(text)

      const command = matchCommand(text)
      if (command) {
        navigate(command.slug, command.label)
      }
    }

    recognition.onerror = () => {
      setListening(false)
      setMessage("Micro indisponible. Tu peux écrire ta demande.")
    }

    recognition.onend = () => setListening(false)

    try {
      recognition.start()
      setListening(true)
    } catch {
      setMessage("Le micro est déjà en écoute. Réessaie dans un instant.")
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault()

    const command = matchCommand(manual)

    if (!command) {
      setMessage("Je n'ai pas reconnu. Essaie « passeport », « acte de naissance » ou « impôts ».")
      return
    }

    navigate(command.slug, command.label)
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
