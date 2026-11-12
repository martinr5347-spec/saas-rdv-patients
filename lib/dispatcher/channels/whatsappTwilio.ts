import twilio from 'twilio'

// Envoi WhatsApp via l'API officielle (Twilio), seul canal WhatsApp depuis le retrait d'Unipile
// (plus aucune organisation ne l'utilisait, confirme par Martin).
//
// L'API officielle WhatsApp Business exige un template Meta pre-approuve pour tout message envoye
// hors de la fenetre de 24h suivant le dernier message du patient. La detection fiable de cette
// fenetre (session ouverte) n'est pas implementee dans cette premiere version -- cf. rapport de
// livraison : chemin "template toujours" uniquement pour l'instant, le chemin "texte libre dans la
// fenetre de 24h" reste a faire plus tard.
export interface TwilioSendResult {
  sid: string
}

export async function sendWhatsAppTwilio(
  subaccountSid: string,
  authToken: string,
  fromNumber: string,
  toPhone: string,
  templateContentSid: string,
  templateVariables: Record<string, string>,
  statusCallbackUrl?: string
): Promise<TwilioSendResult> {
  const client = twilio(subaccountSid, authToken)

  const toWhatsapp = `whatsapp:${toPhone.startsWith('+') ? toPhone : `+${toPhone.replace(/\D/g, '')}`}`
  const fromWhatsapp = `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${fromNumber.replace(/\D/g, '')}`}`

  const message = await client.messages.create({
    to: toWhatsapp,
    from: fromWhatsapp,
    contentSid: templateContentSid,
    contentVariables: JSON.stringify(templateVariables),
    ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
  })

  return { sid: message.sid }
}
