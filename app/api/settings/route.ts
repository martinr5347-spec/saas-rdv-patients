import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveUnipileConnectedAt } from '@/lib/dispatcher/warming'
import { validateMercadoPagoToken } from '@/lib/payments/mercadopago'
import { encryptSecret, decryptSecret } from '@/lib/crypto/settingsEncryption'
import type { Database } from '@/types/database'

type OrgSettingsUpdate = Database['public']['Tables']['org_settings']['Update']

// Colonnes non sensibles explicites -- jamais select('*') sur org_settings ici, mp_access_token
// ne doit jamais apparaitre brut dans une reponse JSON de cette route.
const SAFE_COLUMNS =
  'delai_paiement_h, delai_aviso_h, delai_rappel_h, monto_acompte, costo_total, monnaie, calendly_url, unipile_account_id, mp_access_token, mp_notification_url, canal_email, canal_whatsapp, variantes_mensaje, categorias_notas, categorias_con_foto, variante_control_recall, control_recall_anticipacion_dias'

function toSafeResponse<T extends { mp_access_token?: string | null }>(row: T) {
  const { mp_access_token, ...rest } = row
  const mpTokenConfigured = !!mp_access_token
  let mpTokenLast4: string | null = null
  if (mp_access_token) {
    try {
      mpTokenLast4 = decryptSecret(mp_access_token).slice(-4)
    } catch (e) {
      console.error('Erreur déchiffrement mp_access_token:', e)
    }
  }
  return { ...rest, mpTokenConfigured, mpTokenLast4 }
}

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('org_settings')
    .select(SAFE_COLUMNS)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data ? toSafeResponse(data) : null })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Touche a l'integration de paiement -- role insuffisant rejette la sauvegarde entiere, pas
  // seulement l'appartenance a l'organisation.
  const touchesPaymentConfig = body.mp_access_token !== undefined || body.mp_notification_url !== undefined
  if (touchesPaymentConfig && profile.role !== 'praticien' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'No tienes permiso para modificar la integración de pagos' }, { status: 403 })
  }

  const { data: current } = await supabase
    .from('org_settings')
    .select('unipile_account_id, unipile_connected_at')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  const unipileConnectedAt = resolveUnipileConnectedAt(
    current?.unipile_account_id ?? null,
    body.unipile_account_id,
    current?.unipile_connected_at ?? null
  )

  // Un nouveau token (non vide) declenche une validation live contre l'API MercadoPago avant
  // d'etre chiffre et stocke -- un champ vide ne touche pas a la valeur deja enregistree (jamais
  // d'ecrasement silencieux). Un token invalide rejette toute la sauvegarde plutot que
  // d'appliquer partiellement les autres champs.
  let mpAccessTokenUpdate: string | undefined
  let nickname: string | undefined
  let email: string | undefined
  if (typeof body.mp_access_token === 'string' && body.mp_access_token.trim()) {
    const trimmed = body.mp_access_token.trim()
    const validation = await validateMercadoPagoToken(trimmed)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Token MercadoPago inválido o expirado' }, { status: 400 })
    }
    mpAccessTokenUpdate = encryptSecret(trimmed)
    nickname = validation.nickname ?? undefined
    email = validation.email ?? undefined
  }

  const updatePayload: OrgSettingsUpdate = {
    delai_paiement_h: body.delai_paiement_h,
    delai_aviso_h: body.delai_aviso_h,
    delai_rappel_h: body.delai_rappel_h,
    monto_acompte: body.monto_acompte,
    calendly_url: body.calendly_url,
    unipile_account_id: body.unipile_account_id,
    unipile_connected_at: unipileConnectedAt,
    mp_notification_url: body.mp_notification_url,
    canal_email: body.canal_email,
    canal_whatsapp: body.canal_whatsapp,
    monnaie: body.monnaie,
  }
  if (mpAccessTokenUpdate !== undefined) {
    updatePayload.mp_access_token = mpAccessTokenUpdate
  }

  const { data, error } = await supabase
    .from('org_settings')
    .update(updatePayload)
    .eq('organization_id', profile.organization_id)
    .select(SAFE_COLUMNS)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: { ...toSafeResponse(data), nickname, email } })
}
