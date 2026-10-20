import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

// PATCH = modifie le contenu et/ou la catégorie d'une note existante
export async function PATCH(req: Request, { params }: { params: { id: string; noteId: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  const contenido = (body.contenido as string | undefined)?.trim()
  const categoria = (body.categoria as string | undefined)?.trim() || null
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (!contenido || contenido.length === 0 || contenido.length > 500) {
    return NextResponse.json({ error: 'Nota inválida (máx. 500 caracteres)' }, { status: 400 })
  }
  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  const { data: updated, error } = await supabase
    .from('patient_notes')
    .update({ contenido, categoria })
    .eq('id', params.noteId)
    .eq('patient_id', params.id)
    .select('id, contenido, categoria, created_at')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ note: updated })
}

// DELETE = supprime une note existante
export async function DELETE(req: Request, { params }: { params: { id: string; noteId: string } }) {
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
    .from('patient_notes')
    .delete()
    .eq('id', params.noteId)
    .eq('patient_id', params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
