import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { randomBytes } from 'node:crypto'
import { normalizarNombreArchivo, formatFechaArchivo } from '@/lib/utils/normalizarNombreArchivo'
import { ahoraEnFuseau } from '@/lib/utils/timezone'
import { MAX_PHOTOS_PER_NOTE, MAX_PHOTO_SIZE_BYTES, ALLOWED_PHOTO_TYPES } from '@/lib/patients/notePhotoValidation'

// Meme precedent que app/api/public/gestionar/[token]/route.ts : aucune session, service role
// client, jamais de donnee patient exposee au-dela du strict necessaire (cf. prompt
// notas-foto-transfer-qr -- "aucune donnee patient visible sur la page mobile").

async function loadToken(supabase: ReturnType<typeof createServiceRoleClient>, token: string) {
  return supabase
    .from('photo_transfer_tokens')
    .select('id, status, patient_id, organization_id, created_at, expires_at, organizations(langue, fuseau)')
    .eq('token', token)
    .maybeSingle()
}

function isValidToken(row: { status: string; expires_at: string } | null | undefined) {
  if (!row) return false
  return row.status === 'pending' && new Date(row.expires_at) > new Date()
}

// GET = validite du jeton pour la page mobile -- un booleen et la langue de l'organisation
// (donnee non sensible, necessaire pour afficher la page dans la bonne langue), jamais de nom de
// patient ni d'autre donnee clinique.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()
  const { data: tokenRow } = await loadToken(supabase, params.token)

  const org = tokenRow?.organizations as unknown as { langue: string; fuseau: string } | null
  const valid = isValidToken(tokenRow)

  if (!valid) {
    return NextResponse.json({ valid: false, langue: org?.langue === 'pt' ? 'pt' : 'es' })
  }

  const { count } = await supabase
    .from('patient_note_photos')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', tokenRow!.patient_id)
    .is('note_id', null)
    .gte('created_at', tokenRow!.created_at)

  return NextResponse.json({
    valid: true,
    langue: org?.langue === 'pt' ? 'pt' : 'es',
    remaining: Math.max(0, MAX_PHOTOS_PER_NOTE - (count ?? 0)),
  })
}

// POST = upload direct et definitif dans clinical-photos (multipart, champ "file") -- revalide le
// jeton a chaque appel (peut etre appele plusieurs fois tant qu'il reste valide), n'ecrase jamais
// un envoi precedent : une nouvelle ligne patient_note_photos par photo (note_id null jusqu'au
// rattachement cote Guardar sesion, voir app/api/patients/[id]/notes/route.ts).
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()
  const { data: tokenRow } = await loadToken(supabase, params.token)

  if (!isValidToken(tokenRow)) {
    return NextResponse.json({ error: 'Este enlace ya no es válido.' }, { status: 410 })
  }

  const org = tokenRow!.organizations as unknown as { langue: string; fuseau: string } | null

  const { count } = await supabase
    .from('patient_note_photos')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', tokenRow!.patient_id)
    .is('note_id', null)
    .gte('created_at', tokenRow!.created_at)
  if ((count ?? 0) >= MAX_PHOTOS_PER_NOTE) {
    return NextResponse.json({ error: `Ya alcanzaste el máximo de ${MAX_PHOTOS_PER_NOTE} fotos.` }, { status: 409 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no soportado (solo JPG, PNG, WEBP)' }, { status: 400 })
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return NextResponse.json({ error: 'Archivo demasiado grande (máx. 5 MB)' }, { status: 400 })
  }

  const { data: patientRow } = await supabase.from('patients').select('nom').eq('id', tokenRow!.patient_id).maybeSingle()
  if (!patientRow) {
    return NextResponse.json({ error: 'Este enlace ya no es válido.' }, { status: 410 })
  }

  const nombreNormalizado = normalizarNombreArchivo(patientRow.nom)
  const fecha = formatFechaArchivo(ahoraEnFuseau(org?.fuseau ?? 'America/Lima').fecha)
  const suffix = randomBytes(4).toString('hex')
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${tokenRow!.organization_id}/${tokenRow!.patient_id}/${nombreNormalizado}_${fecha}_${suffix}.${ext}`

  const { error: uploadError } = await supabase.storage.from('clinical-photos').upload(storagePath, file, { contentType: file.type })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: insertError } = await supabase.from('patient_note_photos').insert({
    note_id: null,
    patient_id: tokenRow!.patient_id,
    organization_id: tokenRow!.organization_id,
    storage_path: storagePath,
  })
  if (insertError) {
    // Nettoyage : si l'insertion en base echoue, ne pas laisser un fichier orphelin dans le bucket.
    await supabase.storage.from('clinical-photos').remove([storagePath])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, remaining: Math.max(0, MAX_PHOTOS_PER_NOTE - (count ?? 0) - 1) })
}
