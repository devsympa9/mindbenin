import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"

type FedapayTransaction = {
  id?: number | string
  reference?: string
  status?: string
  [key: string]: unknown
}

type FedapayToken = {
  token?: string
  url?: string
  [key: string]: unknown
}

export type FedapayCheckout = {
  transactionId: string
  reference: string
  checkoutUrl: string
}

@Injectable()
export class FedapayService {
  private readonly logger = new Logger(FedapayService.name)

  get enabled(): boolean {
    return Boolean(process.env.FEDAPAY_SECRET_KEY?.trim())
  }

  private get baseUrl(): string {
    const value = process.env.FEDAPAY_BASE_URL?.trim() || "https://sandbox-api.fedapay.com/v1"
    return value.replace(/\/$/, "")
  }

  private get callbackUrl(): string {
    return (
      process.env.FEDAPAY_CALLBACK_URL?.trim() ||
      `${process.env.API_PUBLIC_URL ?? "http://localhost:4001"}/payments/fedapay/callback`
    )
  }

  /**
   * Crée la collecte FedaPay puis génère le lien de paiement sécurisé.
   * Docs : POST /transactions puis POST /transactions/{id}/token.
   */
  async createCheckout(input: {
    amount: number
    description: string
    merchantReference: string
    customer: {
      firstName: string
      lastName: string
      email: string
      phone: string
    }
  }): Promise<FedapayCheckout> {
    const callbackUrl = new URL(this.callbackUrl)
    callbackUrl.searchParams.set("reference", input.merchantReference)

    const transaction = await this.request<FedapayTransaction>("/transactions", "POST", {
      description: input.description,
      amount: input.amount,
      currency: { iso: "XOF" },
      callback_url: callbackUrl.toString(),
      merchant_reference: input.merchantReference,
      custom_metadata: { dossier: input.merchantReference },
      customer: {
        firstname: input.customer.firstName,
        lastname: input.customer.lastName,
        email: input.customer.email,
        phone_number: {
          number: `+229${input.customer.phone.replace(/^01/, "")}`,
          country: "bj",
        },
      },
    })

    const transactionId = transaction.id ? String(transaction.id) : null

    if (!transactionId) {
      throw new ServiceUnavailableException(
        "FedaPay n'a pas renvoyé d'identifiant de transaction.",
      )
    }

    const token = await this.request<FedapayToken>(
      `/transactions/${encodeURIComponent(transactionId)}/token`,
      "POST",
    )

    if (!token.url) {
      throw new ServiceUnavailableException("FedaPay n'a pas renvoyé de lien de paiement.")
    }

    return {
      transactionId,
      reference: transaction.reference ?? transactionId,
      checkoutUrl: token.url,
    }
  }

  /** Récupère l'état réel de la transaction côté FedaPay (source de vérité). */
  async retrieve(transactionId: string): Promise<FedapayTransaction> {
    return this.request<FedapayTransaction>(
      `/transactions/${encodeURIComponent(transactionId)}`,
      "GET",
    )
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const secretKey = process.env.FEDAPAY_SECRET_KEY?.trim()

    if (!secretKey) {
      throw new ServiceUnavailableException("FedaPay n'est pas configuré.")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        const details = await response.text().catch(() => "")
        this.logger.error(
          `FedaPay ${method} ${path} -> ${response.status} ${details.slice(0, 300)}`,
        )
        throw new ServiceUnavailableException(
          "Le service de paiement FedaPay est indisponible. Réessaie dans un instant.",
        )
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error
      }

      this.logger.error(`FedaPay ${method} ${path} a échoué : ${String(error)}`)
      throw new ServiceUnavailableException(
        "Impossible de joindre FedaPay. Vérifie ta connexion et réessaie.",
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}
