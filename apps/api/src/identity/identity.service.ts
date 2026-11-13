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

  async scan(image?: string) {
    const hasImage = typeof image === "string" && image.trim().length > 0
    let simulated = !hasImage || !this.face.enabled

    if (hasImage && this.face.enabled) {
      try {
        const result = await this.face.detect(image as string)

        if (!result.faceDetected) {
          throw new BadRequestException(
            "Aucun visage détecté. Repositionne-toi face à la caméra et réessaie.",
          )
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
        photoSeed: hasImage && !simulated ? "camera" : identity.photoSeed,
      },
    })

    const token = await this.jwt.signAsync({ sub: user.id })

    return {
      token,
      user: publicUser(user),
      faceVerified: hasImage && !simulated,
      simulated,
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
