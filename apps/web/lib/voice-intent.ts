// Logique vocale pure : reconnaissance de la demande et extraction des champs.

export const COMMANDS = [
  {
    slug: "passeport",
    label: "Passeport",
    keywords: ["passeport", "voyage", "biometrique"],
  },
  {
    slug: "acte-naissance",
    label: "Acte de naissance",
    keywords: ["naissance", "extrait", "mairie"],
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
  {
    slug: "acte-celibat",
    label: "Acte de célibat",
    keywords: ["celibat", "celibataire", "certificat de celibat", "acte de celibat"],
  },
  {
    slug: "attestation-residence",
    label: "Attestation de résidence",
    keywords: ["residence", "attestation de residence", "domicile", "justificatif de domicile"],
  },
  {
    slug: "cnss-cotisation",
    label: "Cotisation CNSS",
    keywords: ["cnss", "cotisation", "securite sociale", "cotisations"],
  },
  {
    slug: "pension-retraite",
    label: "Pension retraite",
    keywords: ["pension", "retraite", "retraite cnss"],
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

const DETAIL_LABELS: Record<string, string> = {
  numeroFacture: "Numéro de compteur",
  montantFacture: "Montant",
  immatriculation: "Immatriculation",
  categorieVehicule: "Catégorie",
  typeVehicule: "Type de véhicule",
  puissanceFiscale: "Puissance fiscale",
  centre: "Centre",
  motif: "Motif",
  nombreCopies: "Copies",
  adresse: "Adresse",
  dureeResidence: "Durée de résidence",
  numeroCNSS: "Numéro CNSS",
  periode: "Période",
  numeroPension: "Numéro de pension",
  typeDemande: "Type de demande",
}

export function detailLabel(key: string): string {
  return DETAIL_LABELS[key] ?? key
}

function findCopies(text: string): string | undefined {
  const raw = text.match(/(\d+|un|une|deux|trois)\s*copies?/i)?.[1]
  if (!raw) return undefined

  const value = /^\d+$/.test(raw) ? Number(raw) : FRENCH_NUMBER_WORDS[normalize(raw)]
  if (!value || value < 1) return undefined

  const copies = Math.min(Math.round(value), 3)
  return `${copies} copie${copies > 1 ? "s" : ""}`
}

function findResidenceAddress(text: string): string | undefined {
  const match =
    text.match(
      /(?:adresse|j'?habite|je vis|je r[eé]side|r[eé]sidant|domicile)\s*(?:aux|au|à|a|:)?\s*([^.!?;]+)/i,
    ) ?? text.match(/\b(?:quartier|au quartier)\s+([^.!?;]+)/i)

  const raw = match?.[1]
  if (!raw) return undefined

  const cleaned = raw
    .replace(/\b(depuis|il y a|ça fait|ca fait|pour|afin de|parce que|car)\b[\s\S]*$/i, "")
    .replace(/[\s,;-]+$/, "")
    .trim()

  if (cleaned.length < 3) return undefined
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function findResidenceDuration(text: string): string | undefined {
  const normalized = normalize(text)

  const years = normalized.match(/(\d+)\s*ans?\b/)
  if (years) {
    const value = Number(years[1])
    if (value > 5) return "Plus de 5 ans"
    if (value >= 1) return "1 à 5 ans"
  }

  if (/\b(\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s*mois\b/.test(normalized)) {
    return "Moins de 1 an"
  }

  return findSelectOption(text, ["Moins de 1 an", "1 à 5 ans", "Plus de 5 ans"])
}

function findResidenceMotive(text: string): string | undefined {
  const normalized = normalize(text)

  if (/\b(banque|compte|credit|pret|bancaire)\b/.test(normalized)) return "Banque"
  if (/\b(ecole|scolarite|inscription|universite|etudiant)\b/.test(normalized)) return "École"
  if (/\b(administration|administratif|prefecture|visa|passeport)\b/.test(normalized)) {
    return "Administration"
  }

  return findSelectOption(text, ["Banque", "École", "Administration", "Autre"])
}

function findCelibatMotive(text: string): string | undefined {
  const normalized = normalize(text)

  if (/\b(mariage|marier|mariee?)\b/.test(normalized)) return "Mariage"
  if (/\b(voyage|visa|etranger|expatriation)\b/.test(normalized)) return "Voyage"
  if (/\b(administratif|administration|bureau|emploi|travail|concours)\b/.test(normalized)) {
    return "Démarche administrative"
  }

  return findSelectOption(text, ["Mariage", "Voyage", "Démarche administrative", "Autre"])
}

function digitGroups(text: string): string[] {
  return (text.match(/\d[\d\s.,-]{3,}/g) ?? [])
    .map((group) => group.replace(/[^0-9]/g, ""))
    .filter((group) => group.length >= 4)
}

function findCnssNumber(text: string): string | undefined {
  const fromKeyword = text.match(/cnss\s*(?:numero|n°|[:=])?\s*([0-9][0-9\s.-]{5,})/i)?.[1]
  const cleaned = fromKeyword?.replace(/[^0-9]/g, "")
  if (cleaned) return cleaned

  return digitGroups(text).find((group) => group.length >= 6 && group.length <= 13)
}

function findCnssPeriod(text: string): string | undefined {
  const normalized = normalize(text)

  if (/\b(tout|toute|toutes|complet|complete|integral)\b/.test(normalized)) {
    return "Toute la période"
  }

  const months = normalized.match(/(\d+)\s*mois/)
  if (months) {
    const value = Number(months[1])
    if (value <= 3) return "3 derniers mois"
    if (value <= 6) return "6 derniers mois"
    return "12 derniers mois"
  }

  if (/\b(annee|annees|an)\b/.test(normalized)) return "12 derniers mois"

  return findSelectOption(text, [
    "3 derniers mois",
    "6 derniers mois",
    "12 derniers mois",
    "Toute la période",
  ])
}

function findPensionNumber(text: string): string | undefined {
  const fromKeyword = text.match(
    /(?:numero|n°|dossier)?\s*(?:de\s*)?(?:pension)?\s*[:=]?\s*([A-Za-z]{2,4}[\s-]?\d{3,8})/i,
  )?.[1]
  if (fromKeyword) return fromKeyword.replace(/\s+/g, "").toUpperCase()

  return digitGroups(text).find((group) => group.length >= 5 && group.length <= 10)
}

function findPensionType(text: string): string | undefined {
  const normalized = normalize(text)

  if (normalized.includes("renouvel")) return "Renouvellement"
  if (normalized.includes("attestation")) return "Attestation"
  if (normalized.includes("releve")) return "Relevé de pension"
  if (normalized.includes("premiere") || normalized.includes("nouvelle")) {
    return "Première demande"
  }

  return undefined
}

export function extractDetails(slug: string, text: string): Record<string, string> {
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

  if (slug === "acte-celibat" || slug === "acte-naissance") {
    const copies = findCopies(text)
    if (copies) details.nombreCopies = copies
  }

  if (slug === "acte-celibat") {
    const motive = findCelibatMotive(text)
    if (motive) details.motif = motive
  }

  if (slug === "attestation-residence") {
    const address = findResidenceAddress(text)
    if (address) details.adresse = address

    const duration = findResidenceDuration(text)
    if (duration) details.dureeResidence = duration

    const motive = findResidenceMotive(text)
    if (motive) details.motif = motive
  }

  if (slug === "cnss-cotisation") {
    const number = findCnssNumber(text)
    if (number) details.numeroCNSS = number

    const period = findCnssPeriod(text)
    if (period) details.periode = period
  }

  if (slug === "pension-retraite") {
    const number = findPensionNumber(text)
    if (number) details.numeroPension = number

    const type = findPensionType(text)
    if (type) details.typeDemande = type
  }

  return details
}

export function matchCommand(value: string) {
  const text = normalize(value)
  let best: { command: (typeof COMMANDS)[number]; score: number } | null = null

  for (const command of COMMANDS) {
    for (const keyword of command.keywords) {
      const normalizedKeyword = normalize(keyword)
      if (!text.includes(normalizedKeyword)) continue

      // Le mot-clé le plus spécifique gagne : « visite technique » plutôt que « voiture ».
      if (!best || normalizedKeyword.length > best.score) {
        best = { command, score: normalizedKeyword.length }
      }
    }
  }

  return best?.command
}

export type VoiceIntent = {
  slug: string
  label: string
  details: Record<string, string>
}

const STATUS_QUERY_PATTERNS = [
  /ou (en )?est (mon|le) dossier/,
  /ou en (est|suis)[- ]je/,
  /statut (de|du) (mon|le) dossier/,
  /etat (de|du) (mon|le) dossier/,
  /suivi (de|du) (mon|le) dossier/,
  /mon dossier (est )?(ou|pret|avance)/,
  /quand (est[- ]ce que )?(je|mon dossier)/,
  /iwe mi/,
  /wema (towe|ce)/,
  /nɔ mi/,
]

/** « Où est mon dossier ? » — question de suivi, pas une nouvelle démarche. */
export function isStatusQuery(value: string): boolean {
  const text = normalize(value)
  return STATUS_QUERY_PATTERNS.some((pattern) => pattern.test(text))
}
