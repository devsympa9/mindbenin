import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

import { FaceVerificationService } from "../face/face.service"
import { PrismaService } from "../prisma/prisma.service"
import { publicUser } from "./identity.simulator"
import { IdentitySimulator } from "./identity.simulator"

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly simulator: IdentitySimulator,
    private readonly face: FaceVerificationService,
  ) {}

  async scan(image?: string, frames?: string[]) {
    const usableFrames = (frames ?? []).filter(
      (frame): frame is string => typeof frame === "string" && frame.length > 100,
    )
    const hasImage = typeof image === "string" && image.trim().length > 0
    const hasFrames = usableFrames.length >= 2
    let simulated = (!hasImage && !hasFrames) || !this.face.enabled
    let livenessScore: number | null = null

    if ((hasImage || hasFrames) && this.face.enabled) {
      try {
        if (hasFrames) {
          const liveness = await this.face.checkLiveness(usableFrames)

          if (!liveness.passed) {
            throw new BadRequestException(
              liveness.reason ??
                "Vérification de présence échouée. Refais le scan avec ton vrai visage, sans photo.",
            )
          }

          livenessScore = liveness.livenessScore
        } else {
          const result = await this.face.detect(image as string)

          if (!result.faceDetected) {
            throw new BadRequestException(
              "Aucun visage détecté. Repositionne-toi face à la caméra et réessaie.",
            )
          }
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error
        }

        this.logger.warn(`Service facial indisponible, bascule en mode simulé : ${String(error)}`)
        simulated = true
      }
    }

    const identity = this.simulator.scan()
    const user = await this.prisma.user.create({
      data: {
        ...identity,
        photoSeed: (hasImage || hasFrames) && !simulated ? "camera" : identity.photoSeed,
        livenessScore,
        livenessCheckedAt: livenessScore !== null ? new Date() : null,
      },
    })

    const token = await this.jwt.signAsync({ sub: user.id })

    return {
      token,
      user: publicUser(user),
      faceVerified: (hasImage || hasFrames) && !simulated,
      simulated,
      livenessScore,
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new UnauthorizedException("Session invalide.")
    }

    return publicUser(user)
  }
}
