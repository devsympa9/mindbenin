import type { Prisma } from "@prisma/client"

export type ServiceField = {
  name: string
  label: string
  type: "text" | "select"
  options?: string[]
  required?: boolean
  placeholder?: string
}

export function parseServiceFields(value: Prisma.JsonValue): ServiceField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return []
    }

    const field = entry as Record<string, unknown>

    if (typeof field.name !== "string" || typeof field.label !== "string") {
      return []
    }

    const options = Array.isArray(field.options)
      ? field.options.filter((option): option is string => typeof option === "string")
      : undefined

    return [
      {
        name: field.name,
        label: field.label,
        type: field.type === "select" ? "select" : "text",
        options,
        required: field.required === true,
        placeholder: typeof field.placeholder === "string" ? field.placeholder : undefined,
      },
    ]
  })
}
