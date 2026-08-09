import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.AWS_SES_SMTP_HOST
  const user = process.env.AWS_SES_SMTP_USER
  const pass = process.env.AWS_SES_SMTP_PASSWORD

  if (!host || !user || !pass) {
    throw new Error('Configuration Amazon SES incomplète')
  }

  transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  })

  return transporter
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) throw new Error('Destinataire email manquant')
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM manquant')
  await getTransporter().sendMail({ from, to, subject, html })
}
