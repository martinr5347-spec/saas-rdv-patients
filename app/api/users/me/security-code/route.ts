import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const codigoNuevo = body.codigoNuevo as string | undefined
  const codigoActual = body.codigoActual as string | undefined

  if (!codigoNuevo || !/^\d{4}$/.test(codigoNuevo)) {
    return NextResponse.json({ error: 'El código debe tener 4 dígitos' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('users')
    .select('codigo_seguridad_hash')
    .eq('id', authUser.id)
    .single()

  // Reconfirmation exigee uniquement si un PIN existe deja -- la toute premiere definition
  // n'a rien a reconfirmer. Verification isolee ici (pas via lib/security/verifyCodigo) : ce
  // PATCH ne doit pas consommer le compteur anti-brute-force des notas clinicas, l'UI force
  // deja un seul essai pour ce formulaire.
  if (existing?.codigo_seguridad_hash) {
    if (!codigoActual || !/^\d{4}$/.test(codigoActual)) {
      return NextResponse.json({ error: 'Ingresa tu código actual' }, { status: 400 })
    }
    const match = await bcrypt.compare(codigoActual, existing.codigo_seguridad_hash)
    if (!match) {
      return NextResponse.json({ error: 'Código actual incorrecto' }, { status: 403 })
    }
  }

  const hash = await bcrypt.hash(codigoNuevo, 10)

  const { error } = await supabase
    .from('users')
    .update({
      codigo_seguridad_hash: hash,
      codigo_seguridad_updated_at: new Date().toISOString(),
    })
    .eq('id', authUser.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
