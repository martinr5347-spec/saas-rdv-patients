export async function sendWhatsApp(accountId: string, phone: string, message: string) {
  const res = await fetch(`${process.env.UNIPILE_BASE_URL}/api/v1/chats`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      attendees_ids: [phone],
      text: message,
    }),
  })
  if (!res.ok) throw new Error(`Unipile error: ${res.status}`)
}
