import { Controller, Get, Logger, Param, Req, Res, UseGuards } from "@nestjs/common"
import type { Response } from "express"

import { QueryAuthGuard, type QueryAuthenticatedRequest } from "../auth/query-auth.guard"
import { DossiersService } from "./dossiers.service"

@Controller("dossiers")
export class DossiersStreamController {
  private readonly logger = new Logger(DossiersStreamController.name)

  constructor(private readonly dossiers: DossiersService) {}

  @Get(":reference/stream")
  @UseGuards(QueryAuthGuard)
  async stream(
    @Req() request: QueryAuthenticatedRequest,
    @Param("reference") reference: string,
    @Res() response: Response,
  ) {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })

    const userId = request.user?.id ?? ""
    let closed = false
    let lastPayload = ""

    const send = (event: string, data: unknown) => {
      if (closed) return
      response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    const tick = async () => {
      try {
        const dossier = await this.dossiers.get(userId, reference)
        const payload = JSON.stringify(dossier)

        if (payload !== lastPayload) {
          lastPayload = payload
          send("dossier", dossier)
        } else {
          send("ping", { at: new Date().toISOString() })
        }
      } catch (error) {
        send("error", { message: "Dossier indisponible." })
        this.logger.debug(`Flux SSE interrompu pour ${reference} : ${String(error)}`)
        cleanup()
      }
    }

    const interval = setInterval(() => void tick(), 3000)

    const cleanup = () => {
      if (closed) return
      closed = true
      clearInterval(interval)
      response.end()
    }

    request.on?.("close", cleanup)
    response.on("close", cleanup)

    await tick()
  }
}
