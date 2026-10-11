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
  const codigo = body.codigo as string | undefined

  if (!codigo || !/^\d{4}$/.test(codigo)) {
    return NextResponse.json({ error: 'El código debe tener 4 dígitos' }, { status: 400 })
  }

  const hash = await bcrypt.hash(codigo, 10)

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
