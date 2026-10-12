import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

async function verifyCodigo(supabase: ReturnType<typeof createClient>, userId: string, codigo: string) {
  const { data: userRow } = await supabase
    .from('users')
    .select('codigo_seguridad_hash')
    .eq('id', userId)
    .single()
  if (!userRow?.codigo_seguridad_hash) {
    return { ok: false, reason: 'Código de seguridad no configurado. Configúralo en Configuración.' }
  }
  const match = await bcrypt.compare(codigo, userRow.codigo_seguridad_hash)
  return { ok: match, reason: match ? null : 'Código incorrecto' }
}

// DELETE = supprime une photo (fichier dans le bucket + ligne en base)
export async function DELETE(req: Request, { params }: { params: { id: string; noteId: string; photoId: string } }) {
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
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  const { data: photoRow } = await supabase
    .from('patient_note_photos')
    .select('id, storage_path, note_id')
    .eq('id', params.photoId)
    .eq('note_id', params.noteId)
    .single()
  if (!photoRow) {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  }

  await supabase.storage.from('clinical-photos').remove([photoRow.storage_path])
  const { error } = await supabase.from('patient_note_photos').delete().eq('id', photoRow.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
