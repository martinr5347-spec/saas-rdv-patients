import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'

// Callback de statut Twilio (delivered/failed/undelivered) -- statut d'envoi uniquement, pas de
// gestion des reponses entrantes des patients (hors scope, cf. prompt). Corps en
// application/x-www-form-urlencoded (standard Twilio), jamais JSON.
//
// Verification de signature particuliere ici : contrairement a MercadoPago/Stripe (un seul secret
// global), chaque organisation a son propre auth_token Twilio -- impossible de verifier la
// signature avant de savoir a quelle organisation le message appartient. On resout d'abord la ligne
// `notifications` via MessageSid (jamais fait confiance avant verification), on en deduit
// l'organisation et son token chiffre, puis on verifie la signature avec CE token avant de traiter
// quoi que ce soit.
export async function POST(req: Request) {
  const rawBody = await req.text()
  const params = Object.fromEntries(new URLSearchParams(rawBody))

  const messageSid = params.MessageSid
  const messageStatus = params.MessageStatus
  const errorCode = params.ErrorCode
  const errorMessage = params.ErrorMessage

  if (!messageSid || !messageStatus) {
    return NextResponse.json({ error: 'Payload Twilio invalide' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: notification } = await supabase
    .from('notifications')
    .select('id, appointment_id, appointments(organization_id, organizations(org_settings(twilio_auth_token_encrypted)))')
    .eq('twilio_message_sid', messageSid)
    .maybeSingle()

  if (!notification) {
    // Pas d'erreur bruyante : un MessageSid inconnu peut arriver (replay, test Twilio, etc.) --
    // on ignore proprement plutot que d'exposer une 500 ou de laisser deviner si l'ID existe.
    return NextResponse.json({ ok: true, ignored: true })
  }

  const orgSettings = (
    notification.appointments as unknown as {
      organizations: { org_settings: { twilio_auth_token_encrypted: string | null } | null } | null
    } | null
  )?.organizations?.org_settings

  if (!orgSettings?.twilio_auth_token_encrypted) {
    console.error('Webhook Twilio: organisation sans twilio_auth_token_encrypted pour', messageSid)
    return NextResponse.json({ ok: true, ignored: true })
  }

  let authToken: string
  try {
    authToken = decryptSecret(orgSettings.twilio_auth_token_encrypted)
  } catch (e) {
    console.error('Webhook Twilio: erreur dechiffrement token', e)
    return NextResponse.json({ ok: true, ignored: true })
  }

  const signature = req.headers.get('X-Twilio-Signature')
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`

  if (!signature || !twilio.validateRequest(authToken, signature, callbackUrl, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  if (messageStatus === 'delivered') {
    await supabase.from('notifications').update({ delivered_at: new Date().toISOString() }).eq('id', notification.id)
  } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
    await supabase
      .from('notifications')
      .update({
        statut: 'failed',
        error_message: errorMessage || (errorCode ? `Twilio error ${errorCode}` : `Twilio status: ${messageStatus}`),
      })
      .eq('id', notification.id)
  }
  // Les statuts intermediaires (queued/sent/sending) ne necessitent pas de mise a jour -- la ligne
  // est deja 'sent' depuis l'appel initial a sendWhatsAppTwilio dans le dispatcher.

  return NextResponse.json({ ok: true })
}
