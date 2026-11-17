const STORAGE_KEY = "mb_voice_replies"

let cachedEnabled: boolean | null = null

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  )
}

export function isVoiceReplyEnabled(): boolean {
  if (!speechSupported()) return false
  if (cachedEnabled !== null) return cachedEnabled

  try {
    cachedEnabled = window.localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    cachedEnabled = true
  }

  return cachedEnabled
}

export function setVoiceReplyEnabled(value: boolean) {
  cachedEnabled = value

  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off")
  } catch {
    // Le stockage peut être bloqué : la préférence reste valable pour la session.
  }

  if (!value) {
    stopSpeaking()
  }
}

export function stopSpeaking() {
  if (speechSupported()) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Lit un texte à voix haute en français.
 * `force` ignore la préférence utilisateur (bouton « Écouter » explicite).
 */
export function speak(text: string, options: { force?: boolean; lang?: string } = {}) {
  if (!text || !speechSupported()) return
  if (!options.force && !isVoiceReplyEnabled()) return

  const synth = window.speechSynthesis
  synth.cancel()

  const lang = options.lang ?? "fr-FR"
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 1.02
  utterance.pitch = 1

  const prefix = lang.slice(0, 2).toLowerCase()
  const voice =
    synth.getVoices().find((candidate) => candidate.lang.toLowerCase() === lang.toLowerCase()) ??
    synth.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith(prefix))

  if (voice) {
    utterance.voice = voice
  }

  synth.speak(utterance)
}
