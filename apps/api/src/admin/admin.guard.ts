import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

export type AdminRole = "admin" | "agent"

export type AdminRequest = {
  headers: Record<string, string | undefined>
  admin?: { id: string; role: AdminRole }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>()
    const header = request.headers.authorization

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token administrateur manquant.")
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string; role?: string }>(
        header.slice(7),
      )

      if (payload.role !== "admin" && payload.role !== "agent") {
        throw new Error("Rôle administrateur requis.")
      }

      request.admin = { id: payload.sub ?? "admin", role: payload.role }
      return true
    } catch {
      throw new UnauthorizedException("Session administrateur invalide ou expirée.")
    }
  }
}
