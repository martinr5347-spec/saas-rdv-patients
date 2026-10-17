import MercadoPagoConfig, { Preference, WebhookSignatureValidator } from 'mercadopago'

export async function createPaymentLink(params: {
  accessToken: string
  externalRef: string
  amount: number
  currency: string
  patientName: string
  notificationUrl: string
  successUrl: string
}) {
  const client = new MercadoPagoConfig({ accessToken: params.accessToken })
  const preference = new Preference(client)

  // MercadoPago rejette auto_return si back_urls.success n'est pas une URL publique
  // (ex: localhost en dev) — on ne l'active que pour une vraie URL https publique.
  const isPublicHttpsUrl = /^https:\/\/(?!localhost|127\.0\.0\.1)/.test(params.successUrl)

  const result = await preference.create({
    body: {
      items: [
        {
          id: 'adelanto',
          title: 'Adelanto de consulta',
          quantity: 1,
          unit_price: params.amount,
          currency_id: params.currency,
        },
      ],
      payer: { name: params.patientName },
      external_reference: params.externalRef,
      notification_url: params.notificationUrl,
      back_urls: { success: params.successUrl },
      ...(isPublicHttpsUrl ? { auto_return: 'approved' as const } : {}),
    },
  })

  return {
    initPoint: result.init_point ?? null,
    preferenceId: result.id ?? null,
  }
}

// Appel de test reel avant de stocker un nouveau token (Configuracion) -- un texte quelconque
// ne doit jamais etre accepte comme token valide. Partage entre actions.ts et
// app/api/settings/route.ts, les deux chemins de sauvegarde existants, pour ne pas dupliquer
// l'appel brut deux fois.
export async function validateMercadoPagoToken(
  accessToken: string
): Promise<{ valid: true; nickname: string | null; email: string | null } | { valid: false }> {
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return { valid: false }
    const data = await res.json().catch(() => null)
    if (!data) return { valid: false }
    return { valid: true, nickname: typeof data.nickname === 'string' ? data.nickname : null, email: typeof data.email === 'string' ? data.email : null }
  } catch {
    return { valid: false }
  }
}

export function verifyMercadoPagoWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
) {
  if (!xSignature || !dataId) return false
  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret,
    })
    return true
  } catch {
    return false
  }
}
