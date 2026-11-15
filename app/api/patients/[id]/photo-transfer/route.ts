import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

const EXPIRATION_MINUTES = 10

// POST = cree un jeton de transfert de photos par QR (cf. prompt notas-foto-transfer-qr). Un seul
// jeton reste actif pendant toute sa duree de vie (10 min) -- il n'est jamais lie a une seule
// photo, plusieurs envois successifs depuis le telephone s'y rattachent tous (voir
// app/api/public/photo-transfer/[token]/route.ts et le GET de polling ci-dessous).
export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()
  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000).toISOString()

  const { error: insertError } = await supabase.from('photo_transfer_tokens').insert({
    token,
    organization_id: patientRow.organization_id,
    patient_id: patientRow.id,
    created_by: authUser.id,
    expires_at: expiresAt,
  })
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/subir-foto/${token}`,
    expiresAt,
  })
}
