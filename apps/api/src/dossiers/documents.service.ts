import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { randomUUID } from "node:crypto"

import { PrismaService } from "../prisma/prisma.service"
import { StorageService } from "../storage/storage.service"

const MAX_SIZE = 4 * 1024 * 1024
const MAX_DOCUMENTS = 8

const ALLOWED_TYPES = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
])

export type UploadDocumentBody = {
  name?: unknown
  mimeType?: unknown
  data?: unknown
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, reference: string, body: UploadDocumentBody) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      select: { id: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    const count = await this.prisma.document.count({ where: { dossierId: dossier.id } })

    if (count >= MAX_DOCUMENTS) {
      throw new BadRequestException(
        `Maximum ${MAX_DOCUMENTS} pièces par dossier. Supprime une pièce pour en ajouter une autre.`,
      )
    }

    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim() : ""
    const extension = ALLOWED_TYPES.get(mimeType)

    if (!extension) {
      throw new BadRequestException("Format accepté : PDF, JPEG, PNG ou WebP.")
    }

    const raw = typeof body?.data === "string" ? body.data.replace(/^data:[^;]+;base64,/, "") : ""

    if (!raw) {
      throw new BadRequestException("Fichier manquant.")
    }

    const buffer = Buffer.from(raw, "base64")

    if (buffer.length === 0) {
      throw new BadRequestException("Fichier vide ou illisible.")
    }

    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException("Fichier trop lourd : 4 Mo maximum.")
    }

    const name = cleanName(body?.name) || `Piece${extension}`
    const key = `dossiers/${dossier.id}/${randomUUID()}${extension}`
    const driver = await this.storage.put(key, buffer, mimeType)

    const document = await this.prisma.document.create({
      data: {
        dossierId: dossier.id,
        name,
        mimeType,
        size: buffer.length,
        storageKey: key,
        driver,
      },
    })

    return this.serialize(document)
  }

  async list(userId: string, reference: string) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { reference, userId },
      select: { id: true },
    })

    if (!dossier) {
      throw new NotFoundException("Dossier introuvable.")
    }

    const documents = await this.prisma.document.findMany({
      where: { dossierId: dossier.id },
      orderBy: { createdAt: "asc" },
    })

    return documents.map((document) => this.serialize(document))
  }

  async download(userId: string, reference: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, dossier: { reference, userId } },
    })

    if (!document) {
      throw new NotFoundException("Pièce introuvable.")
    }

    const body = await this.storage.get(document.storageKey)
    return { document: this.serialize(document), body }
  }

  async remove(userId: string, reference: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, dossier: { reference, userId } },
    })

    if (!document) {
      throw new NotFoundException("Pièce introuvable.")
    }

    await this.prisma.document.delete({ where: { id: document.id } })
    await this.storage.remove(document.storageKey).catch(() => undefined)

    return { ok: true }
  }

  async downloadForAdmin(reference: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, dossier: { reference } },
    })

    if (!document) {
      throw new NotFoundException("Pièce introuvable.")
    }

    const body = await this.storage.get(document.storageKey)
    return { document: this.serialize(document), body }
  }

  async listForAdmin(reference: string) {
    const documents = await this.prisma.document.findMany({
      where: { dossier: { reference } },
      orderBy: { createdAt: "asc" },
    })

    return documents.map((document) => this.serialize(document))
  }

  private serialize(document: {
    id: string
    name: string
    mimeType: string
    size: number
    driver: string
    createdAt: Date
  }) {
    return {
      id: document.id,
      name: document.name,
      mimeType: document.mimeType,
      size: document.size,
      driver: document.driver,
      createdAt: document.createdAt.toISOString(),
    }
  }
}
