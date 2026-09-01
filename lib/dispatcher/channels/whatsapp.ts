// API v1 confirmée en réel (2026-09-01) : POST /api/v1/chats, multipart/form-data,
// account_id + attendees_ids + text dans le body (pas dans l'URL). L'ancienne version
// tentait /v2/:account_id/chats/send en JSON — la route /v2/ n'existe pas sur ce serveur
// (404 immédiat) et /api/v2/ ne répond pas du tout (connexion qui reste ouverte sans réponse).
export async function sendWhatsApp(accountId: string, phone: string, message: string) {
  const whatsappId = `${phone.replace(/\D/g, '')}@s.whatsapp.net`

  const form = new FormData()
  form.append('account_id', accountId)
  form.append('attendees_ids', whatsappId)
  form.append('text', message)

  const res = await fetch(`${process.env.UNIPILE_BASE_URL}/api/v1/chats`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY!,
    },
    body: form,
  })
  if (!res.ok) throw new Error(`Unipile error: ${res.status}`)
}
