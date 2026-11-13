"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconLoader2,
  IconScan,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react"

import { cn } from "@workspace/ui/lib/utils"

import { scanIdentityAction } from "@/lib/actions"
import { formatDate } from "@/lib/format"
import type { UserDTO } from "@/lib/types"

import { Avatar } from "./avatar"

const SCAN_STEPS = [
  "Détection du visage",
  "Interrogation de l'ANIP",
  "Récupération du NPI",
  "Identité numérique prête",
]

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function ScanFlow() {
  const router = useRouter()
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle")
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<UserDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function toggleCamera() {
    if (cameraActive) {
      stopCamera()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraError(null)
      setCameraActive(true)
    } catch {
      setCameraError("Caméra indisponible ou refusée. Le scan simulé fonctionne quand même.")
    }
  }

  async function startScan() {
    setPhase("scanning")
    setError(null)
    setUser(null)
    setStep(0)

    await wait(600)
    setStep(1)
    await wait(700)
    setStep(2)

    const result = await scanIdentityAction()

    if (!result.ok) {
      setError(result.error)
      setPhase("idle")
      return
    }

    stopCamera()
    setUser(result.data)
    setStep(3)
    setPhase("done")
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Vérification d&apos;identité</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ton visage devient ta carte d&apos;identité.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            <IconShieldCheck size={12} aria-hidden="true" /> ANIP · simulé
          </span>
        </div>

        <div className="relative mx-auto mt-5 aspect-[4/5] w-full max-w-[230px] overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-background">
          <video
            ref={videoRef}
            muted
            playsInline
            className={cn("size-full object-cover transition", cameraActive ? "opacity-100" : "opacity-0")}
          />

          {!cameraActive && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid size-32 place-items-center rounded-full border border-primary/15 bg-primary/5">
                <IconUser size={64} stroke={1} className="text-primary/40" aria-hidden="true" />
              </div>
            </div>
          )}

          <span className="absolute left-3 top-3 size-6 rounded-tl-lg border-l-2 border-t-2 border-primary/70" />
          <span className="absolute right-3 top-3 size-6 rounded-tr-lg border-r-2 border-t-2 border-primary/70" />
          <span className="absolute bottom-3 left-3 size-6 rounded-bl-lg border-b-2 border-l-2 border-primary/70" />
          <span className="absolute bottom-3 right-3 size-6 rounded-br-lg border-b-2 border-r-2 border-primary/70" />

          {phase === "scanning" && (
            <span className="absolute inset-x-4 top-0 h-0.5 animate-[mb-scanline_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
          )}

          {phase === "done" && (
            <span className="absolute inset-0 grid place-items-center bg-background/60">
              <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
                <IconCheck size={28} aria-hidden="true" />
              </span>
            </span>
          )}
        </div>

        <ul className="mt-5 space-y-2">
          {SCAN_STEPS.map((label, index) => {
            const done = phase === "done" || index < step
            const active = phase === "scanning" && index === step

            return (
              <li key={label} className="flex items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <IconCheck size={10} aria-hidden="true" />
                  ) : active ? (
                    <IconLoader2 size={9} className="animate-spin" aria-hidden="true" />
                  ) : null}
                </span>
                <span className={done || active ? "font-medium" : "text-muted-foreground"}>{label}</span>
              </li>
            )
          })}
        </ul>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {cameraError && <p className="mt-3 text-xs text-muted-foreground">{cameraError}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={toggleCamera}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-medium transition hover:bg-secondary"
          >
            <IconCamera size={15} aria-hidden="true" />
            {cameraActive ? "Couper" : "Caméra"}
          </button>
          <button
            type="button"
            onClick={startScan}
            disabled={phase === "scanning"}
            className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {phase === "scanning" ? (
              <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <IconScan size={15} aria-hidden="true" />
            )}
            {phase === "scanning" ? "Scan en cours…" : "Scanner mon visage"}
          </button>
        </div>
      </section>

      {user && phase === "done" && (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {user.gender} · né(e) le {formatDate(user.birthDate)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] font-medium text-primary">NPI {user.npi}</p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-secondary/60 p-2.5">
              <dt className="text-muted-foreground">Lieu de naissance</dt>
              <dd className="mt-0.5 font-medium">{user.birthPlace}</dd>
            </div>
            <div className="rounded-xl bg-secondary/60 p-2.5">
              <dt className="text-muted-foreground">Statut ANIP</dt>
              <dd className="mt-0.5 font-medium text-primary">Identité vérifiée</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => {
              router.refresh()
              router.push("/app")
            }}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Continuer <IconArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      )}

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Démo : l&apos;ANIP est simulée et aucune donnée réelle n&apos;est utilisée. En V1, ce scan
        appellera l&apos;API ANIP avec ta photo.
      </p>
    </div>
  )
}
