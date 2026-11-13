import "dotenv/config"
import "reflect-metadata"

import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"

import * as express from "express"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ limit: "10mb", extended: true }))

  app.enableCors({
    origin: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],
    credentials: true,
  })

  const port = Number(process.env.PORT ?? 4000)
  await app.listen(port)

  console.log(`MindBenin API prête sur http://localhost:${port}`)
}

void bootstrap()
