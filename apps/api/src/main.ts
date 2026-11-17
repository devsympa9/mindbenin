import "dotenv/config"
import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import type { NextFunction, Request, Response } from "express"

import * as express from "express"

import { AppModule } from "./app.module"

type RawBodyRequest = Request & { rawBody?: string }

const buckets = new Map<string, number[]>()

/**
 * Limiteur en mémoire : suffisant pour une instance unique, et volontairement
 * sans dépendance. Les routes sensibles (scan, paiement, login admin) sont
 * protégées contre le martelage.
 */
function rateLimit(prefix: string, limit: number, windowMs: number) {
  return (request: Request, response: Response, next: NextFunction) => {
    const key = `${prefix}:${request.ip ?? "unknown"}`
    const now = Date.now()
    const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs)

    if (hits.length >= limit) {
      response.status(429).json({
        statusCode: 429,
        message: "Trop de tentatives. Patiente quelques instants avant de réessayer.",
      })
      return
    }

    hits.push(now)
    buckets.set(key, hits)
    next()
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false })

  app.use(
    express.json({
      limit: "10mb",
      verify: (request, _response, buffer) => {
        ;(request as RawBodyRequest).rawBody = buffer.toString("utf8")
      },
    }),
  )
  app.use(express.urlencoded({ limit: "10mb", extended: true }))

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("X-Frame-Options", "DENY")
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
    response.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(self), geolocation=(self)",
    )

    if (process.env.NODE_ENV === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }

    next()
  })

  app.use("/identity/scan", rateLimit("scan", 30, 60_000))
  app.use("/admin/login", rateLimit("admin-login", 10, 60_000))
  app.use("/dossiers", rateLimit("dossiers", 120, 60_000))
  app.use("/payments/fedapay/webhook", rateLimit("webhook", 120, 60_000))

  app.enableCors({
    origin: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
    credentials: true,
  })

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port)

  console.log(`MindBenin API prête sur http://localhost:${port}`)
}

void bootstrap()
