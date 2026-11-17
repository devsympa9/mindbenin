import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

export type QueryAuthenticatedRequest = {
  headers: Record<string, string | undefined>
  query: Record<string, unknown>
  user?: { id: string }
  on?: (event: string, listener: () => void) => void
}

/**
 * EventSource ne permet pas d'envoyer l'en-tête Authorization : le flux SSE
 * accepte donc le jeton en query string (`?token=...`), avec la même
 * vérification que AuthGuard.
 */
@Injectable()
export class QueryAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<QueryAuthenticatedRequest>()
    const header = request.headers.authorization
    const queryToken = typeof request.query.token === "string" ? request.query.token : null
    const token = header?.startsWith("Bearer ") ? header.slice(7) : queryToken

    if (!token) {
      throw new UnauthorizedException("Token manquant.")
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token)

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
