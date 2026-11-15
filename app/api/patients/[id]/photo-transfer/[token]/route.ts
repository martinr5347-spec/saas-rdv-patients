import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

// GET = pollee par l'ordinateur toutes les ~2s (cf. prompt notas-foto-transfer-qr). Le codigo
// passe par un header (jamais la query string, pour ne pas finir dans des logs d'acces) --
// contrairement a un POST/PUT, un GET fetch() ne peut pas porter de corps JSON.
export async function GET(req: Request, { params }: { params: { id: string; token: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const codigo = req.headers.get('x-codigo')
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  // createClient() respecte RLS (tenant_isolation) -- un jeton d'une autre organisation ne
  // remontera jamais ici, mais on revalide quand meme patient_id contre params.id explicitement.
  const { data: tokenRow } = await supabase
    .from('photo_transfer_tokens')
    .select('id, status, patient_id, organization_id, expires_at, created_at')
    .eq('token', params.token)
    .maybeSingle()
  if (!tokenRow || tokenRow.patient_id !== params.id) {
    return NextResponse.json({ error: 'Jeton no encontrado' }, { status: 404 })
  }

  const expired = tokenRow.status === 'pending' && new Date(tokenRow.expires_at) < new Date()
  const effectiveStatus = expired ? 'expired' : tokenRow.status

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')

  let query = supabase
    .from('patient_note_photos')
    .select('id, storage_path, created_at, momento')
    .eq('patient_id', params.id)
    .is('note_id', null)
    .gte('created_at', tokenRow.created_at)
    .order('created_at', { ascending: true })
  if (since) {
    query = query.gt('created_at', since)
  }
  const { data: photoRows } = await query

  const photos = await Promise.all(
    (photoRows ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage.from('clinical-photos').createSignedUrl(p.storage_path, 60)
      return { id: p.id, url: signed?.signedUrl ?? null, createdAt: p.created_at, momento: p.momento }
    })
  )

  return NextResponse.json({ status: effectiveStatus, expiresAt: tokenRow.expires_at, photos })
}

// DELETE = annulation manuelle depuis l'ordinateur (bouton "Cancelar" sur le panneau QR).
export async function DELETE(req: Request, { params }: { params: { id: string; token: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  const { error } = await supabase
    .from('photo_transfer_tokens')
    .update({ status: 'cancelled' })
    .eq('token', params.token)
    .eq('patient_id', params.id)
    .eq('status', 'pending')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
