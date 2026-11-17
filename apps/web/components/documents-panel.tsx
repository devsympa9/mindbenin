"use client"

import { useRef, useState } from "react"
import {
  IconFileText,
  IconLoader2,
  IconPaperclip,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react"

import { deleteDocumentAction, uploadDocumentAction } from "@/lib/actions"
import { formatDateTime } from "@/lib/format"
import { getLocale, SPEECH_LANG } from "@/lib/i18n"
import { speak } from "@/lib/speech"
import type { DocumentDTO } from "@/lib/types"

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp"
const MAX_SIZE = 4 * 1024 * 1024

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."))
    reader.readAsDataURL(file)
  })
}

export function DocumentsPanel({
  reference,
  initialDocuments,
}: {
  reference: string
  initialDocuments: DocumentDTO[]
}) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function announce(text: string) {
    speak(text, { force: true, lang: SPEECH_LANG[getLocale()] })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError("Fichier trop lourd : 4 Mo maximum.")
      return
    }

    setPending(true)
    setError(null)

    try {
      const data = await readAsBase64(file)
      const result = await uploadDocumentAction(reference, {
        name: file.name,
        mimeType: file.type,
        data,
      })

      if (!result.ok) {
        setError(result.error)
        announce(result.error)
        return
      }

      setDocuments((current) => [...current, result.data])
      announce("Pièce ajoutée au dossier.")
      if (inputRef.current) inputRef.current.value = ""
    } catch {
      setError("Impossible de lire ce fichier.")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(documentId: string) {
    setError(null)
    const result = await deleteDocumentAction(reference, documentId)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setDocuments((current) => current.filter((document) => document.id !== documentId))
  }

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <IconPaperclip size={16} className="text-primary" aria-hidden="true" />
        Pièces justificatives
        <span className="ml-auto text-[10px] font-normal text-muted-foreground">
          {documents.length}/8
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Ajoute ta pièce d&apos;identité, un justificatif de domicile ou une photo. PDF, JPEG, PNG
        ou WebP — 4 Mo maximum. Stockage MinIO si configuré, sinon disque local.
      </p>

      {documents.length > 0 && (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-2 rounded-xl bg-secondary/60 p-2.5"
            >
              <IconFileText size={16} className="shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/documents/${encodeURIComponent(reference)}/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-[11px] font-medium hover:underline"
                >
                  {document.name}
                </a>
                <p className="text-[10px] text-muted-foreground">
                  {sizeLabel(document.size)} · {formatDateTime(document.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(document.id)}
                aria-label={`Supprimer ${document.name}`}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-destructive"
              >
                <IconTrash size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <button
        type="button"
        disabled={pending || documents.length >= 8}
        onClick={() => inputRef.current?.click()}
        className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-[11px] font-medium transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
      >
        {pending ? (
          <IconLoader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <IconUpload size={14} aria-hidden="true" />
        )}
        {pending ? "Envoi en cours…" : "Ajouter une pièce"}
      </button>

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </section>
  )
}
