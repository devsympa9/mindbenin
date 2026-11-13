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
  {
    slug: "tvm",
    label: "TVM",
    keywords: ["tvm", "vehicule", "voiture", "carte grise", "taxe vehicule"],
  },
  {
    slug: "visite-technique",
    label: "Visite technique",
    keywords: ["visite technique", "controle technique", "technique"],
  },
  {
    slug: "facture-soneb",
    label: "Facture SONEB",
    keywords: ["soneb", "eau", "facture eau"],
  },
  {
    slug: "facture-sbee",
    label: "Facture SBEE",
    keywords: ["sbee", "electricite", "courant", "facture electricite"],
  },
] as const

const FRENCH_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  dixsept: 17,
  dixhuit: 18,
  dixneuf: 19,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  "quatre-vingt": 80,
  "quatre-vingts": 80,
  cent: 100,
  mille: 1000,
}

function parseFrenchNumberWords(input: string): number | null {
  const tokens = normalize(input)
    .split(/\s+/)
    .filter(Boolean)

  let total = 0
  let current = 0
  let hasNumber = false

  for (const token of tokens) {
    if (FRENCH_NUMBER_WORDS[token] !== undefined) {
      current += FRENCH_NUMBER_WORDS[token]
      hasNumber = true
      continue
    }

    if (token === "cent" || token === "cents" || token === "cent.") {
      if (current === 0) current = 1
      current *= 100
      continue
    }

    if (token === "mille" || token === "milles") {
      if (current === 0) current = 1
      total += current * 1000
      current = 0
      continue
    }

    if (token === "million" || token === "millions") {
      if (current === 0) current = 1
      total += current * 1000000
      current = 0
      continue
    }
  }

  total += current
  return hasNumber ? total : null
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function findSelectOption(text: string, options: readonly string[]): string | undefined {
  const normalizedText = normalize(text)
  const direct = options.find((option) => normalizedText.includes(normalize(option)))
  if (direct) return direct

  const keywords: Record<string, string> = {
    voiture: "Voiture particulière",
    moto: "Moto",
    camion: "Camion",
    utilitaire: "Utilitaire",
    cotonou: "Cotonou",
    portonovo: "Porto-Novo",
    parakou: "Parakou",
    abomey: "Abomey-Calavi",
    calavi: "Abomey-Calavi",
  }

  for (const [keyword, option] of Object.entries(keywords)) {
    if (normalizedText.includes(keyword) && options.includes(option)) return option
  }

  if (normalizedText.includes("10")) {
    const ten = options.find((option) => option.includes("10 CV"))
    if (ten) return ten
  }
  if (/[789]/.test(normalizedText)) {
    const mid = options.find((option) => option.includes("7 à 9"))
    if (mid) return mid
  }
  if (/[456]/.test(normalizedText)) {
    const low = options.find((option) => option.includes("4 à 6"))
    if (low) return low
  }

  return undefined
}

function extractDetails(slug: string, text: string): Record<string, string> {
  const details: Record<string, string> = {}

  if (slug === "facture-soneb" || slug === "facture-sbee") {
    const meterFromKeyword = text.match(
      /(?:num[eé]ro|compteur|facture)\s*(?:de\s*(?:facture|compteur))?\s*[:=]?\s*([0-9][0-9\s.,-]{4,})/i,
    )?.[1]?.replace(/[^0-9]/g, "")

    const amountDigitMatch = text.match(
      /(?:montant|a payer|payer|somme)\s*(?:de\s*la\s*facture)?\s*[:=]?\s*([0-9][0-9\s.,]*)/i,
    )?.[1]?.replace(/[^0-9]/g, "")

    const amountKeywordIndex = normalize(text).search(/montant|a payer|payer|somme/)
    const amountSegment =
      amountKeywordIndex >= 0 ? text.slice(amountKeywordIndex) : text
    const amountWordMatch = parseFrenchNumberWords(amountSegment)
    const amountFromKeyword = amountDigitMatch || (amountWordMatch ? String(amountWordMatch) : undefined)

    const groups =
      text
        .match(/\d[\d\s.,]*/g)
        ?.map((group) => group.replace(/[^0-9]/g, ""))
        .filter((group) => group.length > 0) ?? []

    let meter = meterFromKeyword
    let amount = amountFromKeyword

    if (!meter && groups.length > 0) {
      meter = groups.reduce((best, current) =>
        current.length >= best.length ? current : best,
      )
    }

    if (!amount && groups.length > 1) {
      const candidates = groups.filter((group) => group !== meter)
      if (candidates.length > 0) {
        amount = candidates.reduce((best, current) =>
          current.length <= best.length ? current : best,
        )
      }
    }

    if (meter && amount && meter === amount && groups.length > 1) {
      const sorted = [...groups].sort((a, b) => b.length - a.length)
      meter = sorted[0]
      amount = sorted[sorted.length - 1]
    }

    if (meter) details.numeroFacture = meter
    if (amount) details.montantFacture = amount
  }

  if (slug === "visite-technique" || slug === "tvm") {
    const plate = text.match(/\b([a-zA-Z]{2}\s?\d{3,4}\s?[a-zA-Z]{2})\b/)?.[1]
    if (plate) details.immatriculation = plate.replace(/\s+/g, " ").trim().toUpperCase()

    const vehicleField = slug === "tvm" ? "categorieVehicule" : "typeVehicule"
    const serviceFields =
      slug === "tvm"
        ? ["Voiture particulière", "Utilitaire", "Moto", "Camion"]
        : ["Voiture particulière", "Utilitaire", "Moto", "Camion"]
    const vehicleOption = findSelectOption(text, serviceFields)
    if (vehicleOption) details[vehicleField] = vehicleOption

    if (slug === "tvm") {
      const powerOption = findSelectOption(text, ["4 à 6 CV", "7 à 9 CV", "10 CV et plus"])
      if (powerOption) details.puissanceFiscale = powerOption
    } else {
      const centreOption = findSelectOption(text, ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi"])
      if (centreOption) details.centre = centreOption
    }
  }

  return details
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
  const [pendingCommand, setPendingCommand] = useState<{
    slug: string
    label: string
    details: Record<string, string>
  } | null>(null)

  function navigate(slug: string, label: string, details: Record<string, string> = {}) {
    const params = new URLSearchParams(details)
    const query = params.toString()
    setMessage(
      Object.keys(details).length > 0
        ? `Je lance : ${label} avec les informations détectées.`
        : `Je lance : ${label}`,
    )
    window.setTimeout(
      () => router.push(`/app/services/${slug}${query ? `?${query}` : ""}`),
      500,
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
      setMessage(
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
      const command = matchCommand(finalTranscript)
      if (command) {
        const details = extractDetails(command.slug, finalTranscript)
        setPendingCommand({ slug: command.slug, label: command.label, details })
        setMessage(
          Object.keys(details).length > 0
            ? `J'ai compris : ${command.label}. Informations détectées : ${Object.entries(
                details,
              )
                .map(([key, value]) => `${key} = ${value}`)
                .join(", ")}. Confirme ou annule.`
            : `J'ai compris : ${command.label}. Confirme ou annule.`,
        )
      } else if (finalTranscript.trim()) {
        setMessage(
          "Je n'ai pas reconnu. Essaie « passeport », « TVM », « visite technique » ou « facture SONEB ».",
        )
      }
    }

    recognition.onerror = () => {
      setListening(false)
      setMessage("Micro indisponible. Tu peux écrire ta demande.")
    }

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
      setMessage(
        "Je n'ai pas reconnu. Essaie « passeport », « TVM », « visite technique » ou « facture SONEB ».",
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
              setMessage("Annulé.")
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
