import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

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
  // n'a rien a reconfirmer. Passe par le meme verifyCodigo() que les 5 autres routes (notes,
  // notes/[noteId], photos, photos/[photoId], alert) : un appel direct a l'API sans passer par
  // l'UI pourrait sinon deviner le PIN par brute-force sans jamais declencher le verrou --
  // l'UI a elle seule ne protege rien cote serveur.
  if (existing?.codigo_seguridad_hash) {
    if (!codigoActual || !/^\d{4}$/.test(codigoActual)) {
      return NextResponse.json({ error: 'Ingresa tu código actual' }, { status: 400 })
    }
    const check = await verifyCodigo(supabase, authUser.id, codigoActual)
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: check.status })
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
