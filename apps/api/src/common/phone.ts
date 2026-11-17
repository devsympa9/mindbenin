export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "")
}

export function isValidBeninPhone(value: string): boolean {
  return /^01\d{8}$/.test(normalizePhone(value))
}

/** Format international E.164 attendu par les opérateurs (+229 01 XX XX XX XX). */
export function toE164(value: string): string | null {
  const digits = normalizePhone(value)

  if (!isValidBeninPhone(digits)) {
    return null
  }

  return `+229${digits}`
}
