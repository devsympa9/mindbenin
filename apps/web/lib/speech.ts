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
export function speak(text: string, options: { force?: boolean } = {}) {
  if (!text || !speechSupported()) return
  if (!options.force && !isVoiceReplyEnabled()) return

  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = "fr-FR"
  utterance.rate = 1.02
  utterance.pitch = 1

  const frenchVoice = synth
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith("fr"))
  if (frenchVoice) {
    utterance.voice = frenchVoice
  }

  synth.speak(utterance)
}
