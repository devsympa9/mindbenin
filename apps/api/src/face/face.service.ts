import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

export type FaceDetectionResult = {
  faceDetected: boolean
  faceCount: number
}

@Injectable()
export class FaceVerificationService {
  private readonly logger = new Logger(FaceVerificationService.name)

  get enabled(): boolean {
    return Boolean(process.env.FACE_SERVICE_URL?.trim())
  }

  async detect(image: string): Promise<FaceDetectionResult> {
    const baseUrl = (process.env.FACE_SERVICE_URL ?? "").trim().replace(/\/$/, "")

    if (!baseUrl) {
      throw new ServiceUnavailableException("Service facial non configure.")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(`${baseUrl}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ image }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => "")
        this.logger.warn(`Service facial ${response.status} : ${details.slice(0, 200)}`)
        throw new ServiceUnavailableException("Service facial indisponible.")
      }

      const payload = (await response.json()) as { faceDetected?: unknown; faceCount?: unknown }

      return {
        faceDetected: Boolean(payload.faceDetected),
        faceCount: Number(payload.faceCount ?? 0),
      }
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
