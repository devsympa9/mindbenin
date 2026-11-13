import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

import { PrismaService } from "../prisma/prisma.service"
import { publicUser } from "./identity.simulator"
import { IdentitySimulator } from "./identity.simulator"

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly simulator: IdentitySimulator,
  ) {}

  async scan() {
    const identity = this.simulator.scan()

    const user = await this.prisma.user.create({
      data: identity,
    })

    const token = await this.jwt.signAsync({ sub: user.id })

    return { token, user: publicUser(user) }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new UnauthorizedException("Session invalide.")
    }

    return publicUser(user)
  }
}
