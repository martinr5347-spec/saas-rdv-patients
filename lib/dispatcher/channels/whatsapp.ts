// API v2 : account_id passe dans l'URL (plus dans le body), attendees_ids -> users_ids.
// Voir https://developer.unipile.com/v2.0/docs/migration-messaging-api
export async function sendWhatsApp(accountId: string, phone: string, message: string) {
  const whatsappId = `${phone.replace(/\D/g, '')}@s.whatsapp.net`

  const res = await fetch(`${process.env.UNIPILE_BASE_URL}/v2/${accountId}/chats/start`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      users_ids: [whatsappId],
      text: message,
    }),
  })
  if (!res.ok) throw new Error(`Unipile error: ${res.status}`)
}
