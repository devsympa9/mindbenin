import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

export type AuthenticatedUser = { id: string }

export type AuthenticatedRequest = {
  headers: Record<string, string | undefined>
  user?: AuthenticatedUser
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token manquant.")
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(header.slice(7))

      if (!payload.sub) {
        throw new Error("Sujet manquant dans le token.")
      }

      request.user = { id: payload.sub }
      return true
    } catch {
      throw new UnauthorizedException("Session invalide ou expirée.")
    }
  }
}
