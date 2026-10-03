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
