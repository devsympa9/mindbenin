import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

export type FaceDetectionResult = {
  faceDetected: boolean
  faceCount: number
}

export type LivenessResult = FaceDetectionResult & {
  motion: number
  sharpness: number
  faceRatio: number
  livenessScore: number
  passed: boolean
  reason: string | null
}

@Injectable()
export class FaceVerificationService {
  private readonly logger = new Logger(FaceVerificationService.name)

  get enabled(): boolean {
    return Boolean(process.env.FACE_SERVICE_URL?.trim())
  }

  async detect(image: string): Promise<FaceDetectionResult> {
    return this.call<FaceDetectionResult>("/detect", { image })
  }

  /** Analyse multi-images : mouvement, netteté et taille du visage (anti-photo). */
  async checkLiveness(frames: string[]): Promise<LivenessResult> {
    return this.call<LivenessResult>("/liveness", { frames })
  }

  private async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const baseUrl = (process.env.FACE_SERVICE_URL ?? "").trim().replace(/\/$/, "")

    if (!baseUrl) {
      throw new ServiceUnavailableException("Service facial non configure.")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => "")
        this.logger.warn(`Service facial ${response.status} : ${details.slice(0, 200)}`)
        throw new ServiceUnavailableException("Service facial indisponible.")
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error
      }

      this.logger.warn(`Service facial injoignable : ${String(error)}`)
      throw new ServiceUnavailableException("Service facial injoignable.")
    } finally {
      clearTimeout(timeout)
    }
  }
}
