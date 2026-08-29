import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveUnipileConnectedAt } from '@/lib/dispatcher/warming'

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
    .select('*')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))

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

  const { data, error } = await supabase
    .from('org_settings')
    .update({
      delai_paiement_h: body.delai_paiement_h,
      delai_aviso_h: body.delai_aviso_h,
      delai_rappel_h: body.delai_rappel_h,
      monto_acompte: body.monto_acompte,
      calendly_url: body.calendly_url,
      unipile_account_id: body.unipile_account_id,
      unipile_connected_at: unipileConnectedAt,
      mp_access_token: body.mp_access_token,
      mp_notification_url: body.mp_notification_url,
      canal_email: body.canal_email,
      canal_whatsapp: body.canal_whatsapp,
      monnaie: body.monnaie,
    })
    .eq('organization_id', profile.organization_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
