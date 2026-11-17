"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { IconCamera, IconCheck, IconLoader2, IconQrcode, IconX } from "@tabler/icons-react"

import { adminCollectAction } from "@/lib/admin-actions"

type DetectedBarcode = { rawValue: string }
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

const PAYLOAD = /^MINDBN\|([A-Z0-9-]+)\|(\d{6})$/

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const [active, setActive] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<{ reference: string; code: string } | null>(null)
  const [manual, setManual] = useState("")
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  useEffect(() => stop, [])

  async function start() {
    const Constructor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector

    if (!Constructor) {
      setUnsupported(true)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new Constructor({ formats: ["qr_code"] })
      setActive(true)
      setError(null)

      timerRef.current = window.setInterval(() => {
        const video = videoRef.current
        if (!video || !video.videoWidth) return

        void detector
          .detect(video)
          .then((codes) => {
            const match = codes
              .map((code) => code.rawValue.match(PAYLOAD))
              .find((candidate) => candidate !== null)

            if (match && match[1] && match[2]) {
              setDetected({ reference: match[1], code: match[2] })
              stop()
            }
          })
          .catch(() => undefined)
      }, 500)
    } catch {
      setError("Caméra indisponible. Saisis le code à la main.")
    }
  }

  async function validate() {
    const target = detected ?? parseManual()

    if (!target) {
      setError("Code invalide. Format attendu : MINDBN|BJ-2026-12345|123456, ou le code seul.")
      return
    }

    setPending(true)
    setError(null)

    const result = await adminCollectAction(target.reference, target.code)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setSuccess(`Retrait validé pour ${target.reference}.`)
    setDetected(null)
    setManual("")
  }

  function parseManual(): { reference: string; code: string } | null {
    const value = manual.trim()
    const payload = value.match(PAYLOAD)

    if (payload?.[1] && payload[2]) {
      return { reference: payload[1], code: payload[2] }
    }

    const pair = value.match(/(BJ-\d{4}-\d{4,6})\D+(\d{6})/i)
    if (pair?.[1] && pair[2]) {
      return { reference: pair[1].toUpperCase(), code: pair[2] }
    }

    return null
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <IconQrcode size={16} className="text-primary" aria-hidden="true" /> Scanner le QR de retrait
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Le QR contient la référence du dossier et son code. La validation passe toujours par
          l&apos;API (contrôle du statut et du code).
        </p>

        <div className="relative mx-auto mt-3 aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className={active ? "size-full object-cover" : "hidden"}
          />
          {!active && (
            <div className="grid size-full place-items-center bg-secondary/60">
              <IconQrcode size={48} className="text-muted-foreground/50" aria-hidden="true" />
            </div>
          )}
          <span className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/60" />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => (active ? stop() : void start())}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-medium transition hover:bg-secondary"
          >
            {active ? <IconX size={15} aria-hidden="true" /> : <IconCamera size={15} aria-hidden="true" />}
            {active ? "Arrêter" : "Activer la caméra"}
          </button>
          {detected && (
            <button
              type="button"
              onClick={() => void validate()}
              disabled={pending}
              className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? (
                <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <IconCheck size={15} aria-hidden="true" />
              )}
              Valider {detected.reference}
            </button>
          )}
        </div>

        {unsupported && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Ce navigateur ne fournit pas de détecteur de QR (Chrome/Edge recommandés). Utilise la
            saisie manuelle ci-dessous.
          </p>
        )}
        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
        {success && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
            <IconCheck size={13} aria-hidden="true" /> {success}
            <Link href="/admin" className="ml-1 font-medium underline">
              Retour à la file
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-xs font-semibold">Saisie manuelle</h2>
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="MINDBN|BJ-2026-12345|123456"
          className="mt-2 h-10 w-full rounded-lg border bg-background px-3 font-mono text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void validate()}
          disabled={pending || !parseManual()}
          className="mt-2 h-9 w-full rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          Valider le retrait
        </button>
      </section>
    </div>
  )
}
