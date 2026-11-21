import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { encryptSecret, decryptSecret } from '@/lib/crypto/settingsEncryption'

// Route temporaire (a supprimer apres usage) -- equivalent de scripts/set-twilio-org.ts mais
// executee cote serveur en production, pour chiffrer avec la VRAIE SETTINGS_ENCRYPTION_KEY de
// Vercel (marquee "Sensitive", donc illisible/non recuperable localement). Protegee par le meme
// CRON_SECRET que les routes cron existantes -- meme pattern, pas de nouveau secret a creer.
function isAuthorized(req: Request) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '') ?? new URL(req.url).searchParams.get('secret')
  return token === process.env.CRON_SECRET
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { organizationId, subaccountSid, whatsappNumber, authToken } = body as Record<string, string | undefined>

  if (!organizationId || !subaccountSid || !whatsappNumber || !authToken) {
    return NextResponse.json(
      { error: 'organizationId, subaccountSid, whatsappNumber, authToken requeridos' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, nom')
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }
  if (!org) {
    return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
  }

  const encrypted = encryptSecret(authToken)

  if (decryptSecret(encrypted) !== authToken) {
    return NextResponse.json({ error: 'Verificacion cifrado/descifrado fallida' }, { status: 500 })
  }

  const { error: upsertError } = await supabase
    .from('org_settings')
    .upsert(
      {
        organization_id: organizationId,
        twilio_subaccount_sid: subaccountSid,
        twilio_whatsapp_number: whatsappNumber,
        twilio_auth_token_encrypted: encrypted,
      },
      { onConflict: 'organization_id' }
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, organizacion: org.nom })
}
