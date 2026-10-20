import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

const MAX_PHOTOS_PER_NOTE = 2
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// POST = upload d'une photo pour une note (multipart/form-data : champs "codigo" et "file")
export async function POST(req: Request, { params }: { params: { id: string; noteId: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await req.formData()
  const codigo = formData.get('codigo') as string | null
  const file = formData.get('file') as File | null
  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no soportado (solo JPG, PNG, WEBP)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx. 5 MB)' }, { status: 400 })
  }

  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  const { data: noteRow } = await supabase
    .from('patient_notes')
    .select('id, organization_id, patient_id')
    .eq('id', params.noteId)
    .eq('patient_id', params.id)
    .single()
  if (!noteRow) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }

  const { count } = await supabase
    .from('patient_note_photos')
    .select('id', { count: 'exact', head: true })
    .eq('note_id', params.noteId)
  if ((count ?? 0) >= MAX_PHOTOS_PER_NOTE) {
    return NextResponse.json({ error: `Máximo ${MAX_PHOTOS_PER_NOTE} fotos por nota` }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${noteRow.organization_id}/${noteRow.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('clinical-photos')
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: photoRow, error: insertError } = await supabase
    .from('patient_note_photos')
    .insert({ note_id: noteRow.id, organization_id: noteRow.organization_id, storage_path: storagePath })
    .select('id, storage_path, created_at')
    .single()
  if (insertError) {
    // Nettoyage : si l'insertion en base échoue, ne pas laisser un fichier orphelin dans le bucket.
    await supabase.storage.from('clinical-photos').remove([storagePath])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: signedUrl } = await supabase.storage
    .from('clinical-photos')
    .createSignedUrl(storagePath, 300) // 5 minutes — suffisant pour un affichage immédiat côté client

  return NextResponse.json({ photo: { ...photoRow, url: signedUrl?.signedUrl ?? null } })
}
