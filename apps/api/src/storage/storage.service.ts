import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

/**
 * Stockage des pièces justificatives.
 *
 * - Si `S3_ENDPOINT` + `S3_BUCKET` + clés sont fournis (MinIO dans le compose),
 *   les fichiers partent vers le stockage objet compatible S3.
 * - Sinon on écrit dans `STORAGE_DIR` (démo locale) pour que l'application
 *   reste utilisable sans Docker ni compte cloud.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly bucketReady = new WeakMap<S3Client, Promise<void>>()

  get driver(): "s3" | "local" {
    return this.s3 ? "s3" : "local"
  }

  private get s3(): S3Client | null {
    const endpoint = process.env.S3_ENDPOINT?.trim()
    const bucket = process.env.S3_BUCKET?.trim()
    const accessKeyId = process.env.S3_ACCESS_KEY?.trim()
    const secretAccessKey = process.env.S3_SECRET_KEY?.trim()

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return null
    }

    return new S3Client({
      region: process.env.S3_REGION?.trim() || "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  private get bucket(): string {
    return process.env.S3_BUCKET?.trim() || "mindbenin"
  }

  private get localDir(): string {
    return resolve(process.env.STORAGE_DIR?.trim() || join(process.cwd(), "storage"))
  }

  private localPath(key: string): string {
    const target = resolve(join(this.localDir, key))

    if (!target.startsWith(this.localDir)) {
      throw new NotFoundException("Fichier introuvable.")
    }

    return target
  }

  async put(key: string, body: Buffer, contentType: string): Promise<"s3" | "local"> {
    const client = this.s3

    if (!client) {
      const target = this.localPath(key)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, body)
      return "local"
    }

    await this.ensureBucket(client)

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )

    return "s3"
  }

  async get(key: string): Promise<Buffer> {
    const client = this.s3

    if (!client) {
      try {
        return await readFile(this.localPath(key))
      } catch {
        throw new NotFoundException("Fichier introuvable.")
      }
    }

    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )

      if (!result.Body) {
        throw new NotFoundException("Fichier introuvable.")
      }

      return Buffer.from(await result.Body.transformToByteArray())
    } catch (error) {
      this.logger.error(`Lecture ${key} impossible : ${String(error)}`)
      throw new NotFoundException("Fichier introuvable.")
    }
  }

  async remove(key: string): Promise<void> {
    const client = this.s3

    if (!client) {
      await rm(this.localPath(key), { force: true })
      return
    }

    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  private ensureBucket(client: S3Client): Promise<void> {
    const cached = this.bucketReady.get(client)

    if (cached) {
      return cached
    }

    const task = (async () => {
      try {
        await client.send(new HeadBucketCommand({ Bucket: this.bucket }))
      } catch {
        try {
          await client.send(new CreateBucketCommand({ Bucket: this.bucket }))
        } catch (error) {
          this.logger.warn(`Création du bucket ${this.bucket} impossible : ${String(error)}`)
        }
      }
    })()

    this.bucketReady.set(client, task)
    return task
  }
}
