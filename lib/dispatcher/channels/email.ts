import { Resend } from 'resend'

let resend: Resend | null = null

function getResend() {
  if (resend) return resend

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Configuration Resend incomplète')
  }

  resend = new Resend(apiKey)
  return resend
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) throw new Error('Destinataire email manquant')
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM manquant')

  const { error } = await getResend().emails.send({ from, to, subject, html })
  if (error) throw new Error(error.message)
}
