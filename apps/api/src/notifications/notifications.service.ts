import { Injectable, Logger } from "@nestjs/common"

import { toE164 } from "../common/phone"
import { PrismaService } from "../prisma/prisma.service"

export type NotificationChannelName = "SMS" | "WHATSAPP"

export type NotifyInput = {
  dossierId?: string
  userId?: string
  phone?: string | null
  title: string
  body: string
  channels?: NotificationChannelName[]
}

type DeliveryStatus = "ENVOYE" | "SIMULE" | "ECHEC"

type Delivery = {
  status: DeliveryStatus
  provider?: string
  error?: string
}

const DEFAULT_CHANNELS: NotificationChannelName[] = ["SMS", "WHATSAPP"]

/**
 * Notifications sortantes des dossiers.
 *
 * Chaque envoi est d'abord journalisé en base : le journal est la source de
 * vérité pour l'usager et pour le back-office. La livraison réelle passe par
 * Twilio (SMS + WhatsApp) ou l'API WhatsApp Cloud si des clés existent ;
 * sinon le message reste en mode « SIMULE » et l'application continue de
 * fonctionner sans configuration.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  get liveSms(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        (process.env.TWILIO_FROM?.trim() || process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()),
    ) || Boolean(process.env.SMS_WEBHOOK_URL?.trim())
  }

  get liveWhatsapp(): boolean {
    return Boolean(
      process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_ID?.trim(),
    )
  }

  async notify(input: NotifyInput) {
    const phone = input.phone ? toE164(input.phone) : null

    if (!phone) {
      return []
    }

    const channels = input.channels ?? DEFAULT_CHANNELS

    return Promise.all(
      channels.map(async (channel) => {
        const delivery = await this.deliver(channel, phone, input.body)

        return this.prisma.notification.create({
          data: {
            dossierId: input.dossierId ?? null,
            userId: input.userId ?? null,
            channel,
            recipient: phone,
            title: input.title,
            body: input.body,
            status: delivery.status,
            provider: delivery.provider ?? null,
            error: delivery.error ?? null,
            sentAt: delivery.status === "ENVOYE" ? new Date() : null,
          },
        })
      }),
    )
  }

  /** Ne bloque jamais l'appelant : une panne d'opérateur ne casse pas un dossier. */
  async notifyQuietly(input: NotifyInput) {
    try {
      return await this.notify(input)
    } catch (error) {
      this.logger.error(`Notification non journalisée : ${String(error)}`)
      return []
    }
  }

  async listForUser(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { OR: [{ userId }, { dossier: { userId } }] },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return { ok: true }
  }

  async pendingRetry(limit = 20) {
    const items = await this.prisma.notification.findMany({
      where: { status: { in: ["ECHEC", "EN_ATTENTE"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { dossier: { select: { reference: true } } },
    })

    const results: { id: string; status: DeliveryStatus }[] = []

    for (const item of items) {
      const delivery = await this.deliver(item.channel, item.recipient, item.body)

      await this.prisma.notification.update({
        where: { id: item.id },
        data: {
          status: delivery.status,
          provider: delivery.provider ?? item.provider,
          error: delivery.error ?? null,
          sentAt: delivery.status === "ENVOYE" ? new Date() : null,
        },
      })

      results.push({ id: item.id, status: delivery.status })
    }

    return { retried: results.length, results }
  }

  private async deliver(
    channel: NotificationChannelName,
    recipient: string,
    body: string,
  ): Promise<Delivery> {
    try {
      if (channel === "SMS") {
        return await this.deliverSms(recipient, body)
      }

      return await this.deliverWhatsapp(recipient, body)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Envoi ${channel} vers ${recipient} en échec : ${message}`)
      return { status: "ECHEC", error: message.slice(0, 300) }
    }
  }

  private async deliverSms(recipient: string, body: string): Promise<Delivery> {
    const webhook = process.env.SMS_WEBHOOK_URL?.trim()

    if (webhook) {
      const response = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SMS_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN.trim()}` }
            : {}),
        },
        body: JSON.stringify({ to: recipient, body }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        throw new Error(`webhook SMS ${response.status}`)
      }

      return { status: "ENVOYE", provider: "webhook" }
    }

    const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const token = process.env.TWILIO_AUTH_TOKEN?.trim()
    const from = process.env.TWILIO_FROM?.trim()
    const messagingService = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()

    if (!sid || !token || (!from && !messagingService)) {
      return { status: "SIMULE", provider: "journal" }
    }

    const payload = new URLSearchParams({ To: recipient, Body: body })

    if (messagingService) {
      payload.set("MessagingServiceSid", messagingService)
    } else if (from) {
      payload.set("From", from)
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (!response.ok) {
      throw new Error(`Twilio ${response.status} ${(await response.text()).slice(0, 160)}`)
    }

    return { status: "ENVOYE", provider: "twilio" }
  }

  private async deliverWhatsapp(recipient: string, body: string): Promise<Delivery> {
    const token = process.env.WHATSAPP_TOKEN?.trim()
    const phoneId = process.env.WHATSAPP_PHONE_ID?.trim()

    if (!token || !phoneId) {
      return { status: "SIMULE", provider: "journal" }
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: false, body },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (!response.ok) {
      throw new Error(
        `WhatsApp ${response.status} ${(await response.text()).slice(0, 160)}`,
      )
    }

    return { status: "ENVOYE", provider: "whatsapp-cloud" }
  }
}
