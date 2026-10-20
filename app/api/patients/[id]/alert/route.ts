import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

// PATCH = définit ou efface (texte vide/null) l'alerte clinique épinglée du patient
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  const alerta = (body.alerta as string | undefined)?.trim() || null
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (alerta && alerta.length > 300) {
    return NextResponse.json({ error: 'Alerta inválida (máx. 300 caracteres)' }, { status: 400 })
  }
  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  const { data: updated, error } = await supabase
    .from('patients')
    .update({ alerta_clinica: alerta, alerta_clinica_updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('alerta_clinica, alerta_clinica_updated_at')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ alerta: updated.alerta_clinica, alertaUpdatedAt: updated.alerta_clinica_updated_at })
}
