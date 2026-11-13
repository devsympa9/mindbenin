export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, "")
}

export function isValidBeninPhone(value: string): boolean {
  return /^01\d{8}$/.test(normalizePhone(value))
}
