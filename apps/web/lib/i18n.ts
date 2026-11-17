import type { DossierStatusValue } from "@/lib/status"

export type Locale = "fr" | "fon" | "yo"

export const LOCALES: { value: Locale; label: string; hint: string }[] = [
  { value: "fr", label: "Français", hint: "FR" },
  { value: "fon", label: "Fɔngbè", hint: "FON" },
  { value: "yo", label: "Yorùbá", hint: "YO" },
]

/**
 * Traductions communautaires (à faire relire par des locuteurs avant mise en
 * production) : elles couvrent les statuts et les phrases prononcées, ce qui
 * suffit pour qu'une personne non francophone suive son dossier à la voix.
 */
const STATUS_LABELS: Record<Locale, Record<DossierStatusValue, string>> = {
  fr: {
    DEMANDE_ENVOYEE: "Demande envoyée",
    IDENTITE_VERIFIEE: "Identité vérifiée",
    EN_COURS_TRAITEMENT: "En cours de traitement",
    PRET_A_RECUPERER: "Prêt à récupérer",
    RECUPERE: "Récupéré",
    ANNULE: "Annulé",
  },
  fon: {
    DEMANDE_ENVOYEE: "Dodoo sɛ́n",
    IDENTITE_VERIFIEE: "Nyikɔ́ ɖiɖé",
    EN_COURS_TRAITEMENT: "E to azɔ̀ wá",
    PRET_A_RECUPERER: "Wema ɖo té",
    RECUPERE: "Ko yin mimɔ",
    ANNULE: "Ko yin fiflɛ́",
  },
  yo: {
    DEMANDE_ENVOYEE: "Ìbéèrè ti lọ",
    IDENTITE_VERIFIEE: "Ìdánimọ̀ ti jẹ́rìí",
    EN_COURS_TRAITEMENT: "Ìṣiṣẹ́ ń lọ",
    PRET_A_RECUPERER: "Iwe ti ṣetan",
    RECUPERE: "A ti gbà",
    ANNULE: "A ti fagilé",
  },
}

type PhraseKey =
  | "dossierCreated"
  | "paymentConfirmed"
  | "paymentError"
  | "statusUpdated"
  | "notFound"
  | "listening"
  | "thanks"

const PHRASES: Record<Locale, Record<PhraseKey, string>> = {
  fr: {
    dossierCreated: "Dossier créé. Référence {reference}. {amount} à payer.",
    paymentConfirmed: "Paiement de {amount} confirmé pour {service}.",
    paymentError: "Le paiement n'a pas abouti. {reason}",
    statusUpdated: "Ton dossier {reference} est maintenant : {status}.",
    notFound: "Je ne trouve aucun dossier à ton nom.",
    listening: "Je t'écoute.",
    thanks: "Merci d'avoir utilisé MindBenin.",
  },
  fon: {
    dossierCreated: "Wema ko yin dada. Xó {reference}. {amount} wɛ̀ a na sú.",
    paymentConfirmed: "Akwɛ {amount} ko wa ɖó {service} wu.",
    paymentError: "Akwɛ ɔ ma wa ǎ. {reason}",
    statusUpdated: "Wema towe {reference} ɖo {status}.",
    notFound: "N ma mɔ wema ɖébǔ to nyikɔ́ towe ji ǎ.",
    listening: "Un to xó towe.",
    thanks: "Awanu, MindBenin wɛ.",
  },
  yo: {
    dossierCreated: "A ti dá iwe naa. Nọ́mbà {reference}. {amount} ni kí o san.",
    paymentConfirmed: "A ti gba owó {amount} fún {service}.",
    paymentError: "Owó náà kò lọ. {reason}",
    statusUpdated: "Iwe rẹ {reference} wà ní {status}.",
    notFound: "N kò rí iwe kankan lórí orúkọ rẹ.",
    listening: "Mo ń gbọ́ ọ.",
    thanks: "Ẹ ṣé fún lílo MindBenin.",
  },
}

export function statusLabel(locale: Locale, status: DossierStatusValue): string {
  return STATUS_LABELS[locale][status] ?? STATUS_LABELS.fr[status]
}

export function phrase(
  locale: Locale,
  key: PhraseKey,
  values: Record<string, string> = {},
): string {
  const template = PHRASES[locale][key] ?? PHRASES.fr[key]

  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    template,
  )
}

const LOCALE_KEY = "mb_locale"
export const LOCALE_EVENT = "mb-locale-change"

export function getLocale(): Locale {
  if (typeof window === "undefined") return "fr"

  try {
    const stored = window.localStorage.getItem(LOCALE_KEY)
    if (stored === "fr" || stored === "fon" || stored === "yo") return stored
  } catch {
    // Stockage bloqué : on reste en français.
  }

  return "fr"
}

export function setLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // La préférence reste valable pour la session.
  }

  document.documentElement.lang = locale === "fr" ? "fr" : locale
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: locale }))
}

/** BCP-47 utilisé par speechSynthesis pour choisir une voix. */
export const SPEECH_LANG: Record<Locale, string> = {
  fr: "fr-FR",
  fon: "fr-FR",
  yo: "yo-NG",
}

