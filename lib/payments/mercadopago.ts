import MercadoPagoConfig, { Preference, WebhookSignatureValidator } from 'mercadopago'

export async function createPaymentLink(params: {
  accessToken: string
  externalRef: string
  amount: number
  patientName: string
  notificationUrl: string
  successUrl: string
}) {
  const client = new MercadoPagoConfig({ accessToken: params.accessToken })
  const preference = new Preference(client)

  const result = await preference.create({
    body: {
      items: [
        {
          id: 'acompte',
          title: 'Acompte consultation',
          quantity: 1,
          unit_price: params.amount,
          currency_id: 'PEN',
        },
      ],
      payer: { name: params.patientName },
      external_reference: params.externalRef,
      notification_url: params.notificationUrl,
      back_urls: { success: params.successUrl },
      auto_return: 'approved',
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
