import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'

// POST = déverrouille ET retourne la liste des notes existantes, l'alerte clínica y las categorías disponibles
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

  const { data: notes, error } = await supabase
    .from('patient_notes')
    .select('id, contenido, categoria, created_at, sesion_id, patient_note_photos(id, storage_path, created_at)')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // URLs signées régénérées à chaque déverrouillage — jamais stockées en clair, seul storage_path l'est.
  const notesWithPhotoUrls = await Promise.all(
    (notes ?? []).map(async (note) => {
      const photos = await Promise.all(
        (note.patient_note_photos ?? []).map(async (photo) => {
          const { data: signed } = await supabase.storage
            .from('clinical-photos')
            .createSignedUrl(photo.storage_path, 300)
          return { id: photo.id, url: signed?.signedUrl ?? null, created_at: photo.created_at }
        })
      )
      return {
        id: note.id,
        contenido: note.contenido,
        categoria: note.categoria,
        created_at: note.created_at,
        sesionId: note.sesion_id,
        photos,
      }
    })
  )

  const { data: patientRow } = await supabase
    .from('patients')
    .select(
      'alerta_clinica, alerta_clinica_updated_at, organization_id, proximo_control_fecha, proximo_control_meses, proximo_control_enviado, proximo_control_enviado_at, proximo_control_photo_note_id'
    )
    .eq('id', params.id)
    .single()

  let categorias: string[] = []
  let categoriasConFoto: string[] = []
  if (patientRow?.organization_id) {
    const { data: orgSettings } = await supabase
      .from('org_settings')
      .select('categorias_notas, categorias_con_foto')
      .eq('organization_id', patientRow.organization_id)
      .single()
    categorias = orgSettings?.categorias_notas ?? []
    categoriasConFoto = orgSettings?.categorias_con_foto ?? []
  }

  // Réutilise les URLs déjà signées ci-dessus plutôt que de re-signer -- évite un appel Storage en plus.
  const linkedPhotoNote = patientRow?.proximo_control_photo_note_id
    ? notesWithPhotoUrls.find((n) => n.id === patientRow.proximo_control_photo_note_id)
    : undefined

  return NextResponse.json({
    notes: notesWithPhotoUrls,
    alerta: patientRow?.alerta_clinica ?? null,
    alertaUpdatedAt: patientRow?.alerta_clinica_updated_at ?? null,
    categorias,
    categoriasConFoto,
    proximoControl: {
      fecha: patientRow?.proximo_control_fecha ?? null,
      meses: patientRow?.proximo_control_meses ?? null,
      enviado: patientRow?.proximo_control_enviado ?? false,
      enviadoAt: patientRow?.proximo_control_enviado_at ?? null,
      photoNoteId: patientRow?.proximo_control_photo_note_id ?? null,
      photoThumbUrl: linkedPhotoNote?.photos?.[0]?.url ?? null,
    },
  })
}

// PUT = enregistre un lot de notes (une "session" de saisie multi-catégories) en une seule requête --
// toutes les notes créées ici partagent un même sesion_id généré côté serveur, qui sert ensuite au
// regroupement visuel réel côté client (voir PatientDetailView.tsx, groupNotesBySesion). Une session
// peut contenir une seule entrée (pas de minimum imposé).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const codigo = body.codigo as string | undefined
  const entradasRaw = body.entradas

  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (!Array.isArray(entradasRaw) || entradasRaw.length === 0) {
    return NextResponse.json({ error: 'Ninguna entrada para guardar' }, { status: 400 })
  }

  const entradas = entradasRaw.map((e: unknown) => {
    const entry = e as { contenido?: unknown; categoria?: unknown }
    return {
      contenido: typeof entry?.contenido === 'string' ? entry.contenido.trim() : '',
      categoria: typeof entry?.categoria === 'string' && entry.categoria.trim() ? entry.categoria.trim() : null,
    }
  })

  for (const entrada of entradas) {
    if (!entrada.contenido || entrada.contenido.length === 0 || entrada.contenido.length > 500) {
      return NextResponse.json({ error: 'Nota inválida (máx. 500 caracteres)' }, { status: 400 })
    }
  }

  const check = await verifyCodigo(supabase, authUser.id, codigo)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: check.status })
  }

  // organization_id récupéré depuis le patient, jamais depuis le body
  const { data: patientRow } = await supabase
    .from('patients')
    .select('organization_id')
    .eq('id', params.id)
    .single()

  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const sesionId = crypto.randomUUID()

  const { data: newNotes, error } = await supabase
    .from('patient_notes')
    .insert(
      entradas.map((entrada) => ({
        patient_id: params.id,
        organization_id: patientRow.organization_id,
        contenido: entrada.contenido,
        categoria: entrada.categoria,
        sesion_id: sesionId,
      }))
    )
    .select('id, contenido, categoria, created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: newNotes, sesionId })
}
