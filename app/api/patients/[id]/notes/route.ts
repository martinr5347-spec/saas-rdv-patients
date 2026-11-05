import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCodigo } from '@/lib/security/verifyCodigo'
import { ahoraEnFuseau } from '@/lib/utils/timezone'

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
    .select(
      'id, contenido, categoria, created_at, sesion_id, patient_note_photos(id, storage_path, created_at), patient_note_sesiones(comentario_final, appointment_id)'
    )
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
        comentarioFinal: note.patient_note_sesiones?.comentario_final ?? null,
        appointmentId: note.patient_note_sesiones?.appointment_id ?? null,
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

// PUT = enregistre un lot de notes (une "session" de saisie multi-catégories) -- crée d'abord la ligne
// patient_note_sesiones (avec son commentaire final optionnel), puis les notes du lot qui pointent
// toutes vers elle via sesion_id, pour le regroupement visuel réel côté client (voir
// PatientDetailView.tsx, groupNotesBySesion). Une session peut contenir une seule entrée (pas de
// minimum imposé).
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
  const comentarioFinal =
    typeof body.comentarioFinal === 'string' && body.comentarioFinal.trim() ? body.comentarioFinal.trim() : null
  const appointmentIdRaw = typeof body.appointmentId === 'string' && body.appointmentId ? body.appointmentId : null

  if (!codigo) {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }
  if (!Array.isArray(entradasRaw) || entradasRaw.length === 0) {
    return NextResponse.json({ error: 'Ninguna entrada para guardar' }, { status: 400 })
  }
  if (comentarioFinal && comentarioFinal.length > 500) {
    return NextResponse.json({ error: 'Comentario inválido (máx. 500 caracteres)' }, { status: 400 })
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

  // organization_id récupéré depuis le patient, jamais depuis le body -- fuseau de l'organisation
  // inclus pour calculer "aujourd'hui" dans le bon jour calendaire (voir déduction ci-dessous).
  const { data: patientRow } = await supabase
    .from('patients')
    .select('organization_id, organizations(fuseau)')
    .eq('id', params.id)
    .single()

  if (!patientRow) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // appointmentId optionnel (prefill ?addNota=1&appointmentId=... depuis AppointmentDetailView) --
  // revalidé contre ce patient avant d'être enregistré, jamais fait confiance tel quel.
  let appointmentId: string | null = null
  if (appointmentIdRaw) {
    const { data: apptRow } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', appointmentIdRaw)
      .eq('patient_id', params.id)
      .maybeSingle()
    appointmentId = apptRow?.id ?? null
  } else {
    // Aucun raccourci RDV explicite -- on ne déduit un appointment_id que si ce patient a
    // EXACTEMENT un RDV le jour même, calculé dans le fuseau de l'organisation (pas le jour UTC
    // serveur -- en soirée dans un fuseau négatif, le jour UTC peut déjà être passé au lendemain).
    // Zéro ou plusieurs RDV ce jour-là : aucune déduction, appointment_id reste null (comportement
    // actuel inchangé), jamais de fusion ambiguë entre plusieurs RDV du même jour.
    const hoy = ahoraEnFuseau(patientRow.organizations?.fuseau ?? 'America/Lima').fecha
    const { data: citasHoy } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', params.id)
      .eq('fecha_cita', hoy)
    if (citasHoy && citasHoy.length === 1) {
      appointmentId = citasHoy[0].id
    }
  }

  // Une session de notes correspond à un RDV, pas à un clic sur "Guardar sesión" : si une session
  // existe déjà pour ce même appointment_id, on la réutilise (fusion) au lieu d'en créer une
  // nouvelle -- comentario_final remplace alors l'ancien plutôt que de le dupliquer.
  let sesion: { id: string; comentario_final: string | null } | null = null
  let sesionEsNueva = false
  if (appointmentId) {
    const { data: existingSesion } = await supabase
      .from('patient_note_sesiones')
      .select('id, comentario_final')
      .eq('appointment_id', appointmentId)
      .eq('patient_id', params.id)
      .maybeSingle()

    if (existingSesion) {
      if (comentarioFinal !== null) {
        const { data: updatedSesion, error: updateError } = await supabase
          .from('patient_note_sesiones')
          .update({ comentario_final: comentarioFinal })
          .eq('id', existingSesion.id)
          .select('id, comentario_final')
          .single()
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
        sesion = updatedSesion
      } else {
        sesion = existingSesion
      }
    }
  }

  // La session (table patient_note_sesiones, migration 040) est créée d'abord -- son id sert ensuite
  // de sesion_id, vraie FK, partagé par toutes les notes du lot.
  if (!sesion) {
    const { data: newSesion, error: sesionError } = await supabase
      .from('patient_note_sesiones')
      .insert({
        patient_id: params.id,
        organization_id: patientRow.organization_id,
        comentario_final: comentarioFinal,
        appointment_id: appointmentId,
      })
      .select('id, comentario_final')
      .single()

    if (sesionError) {
      // Race condition (migration 044, index unique partiel sur appointment_id) : une autre
      // requête quasi simultanée vient de créer la session pour ce même appointment_id entre
      // notre SELECT de fusion ci-dessus et cet INSERT -- on la récupère et on y fusionne nos
      // notes plutôt que de renvoyer une erreur 500 au praticien.
      if (sesionError.code === '23505' && appointmentId) {
        const { data: concurrentSesion } = await supabase
          .from('patient_note_sesiones')
          .select('id, comentario_final')
          .eq('appointment_id', appointmentId)
          .eq('patient_id', params.id)
          .maybeSingle()

        if (!concurrentSesion) {
          return NextResponse.json({ error: sesionError.message }, { status: 500 })
        }

        if (comentarioFinal !== null) {
          const { data: updatedSesion, error: updateError } = await supabase
            .from('patient_note_sesiones')
            .update({ comentario_final: comentarioFinal })
            .eq('id', concurrentSesion.id)
            .select('id, comentario_final')
            .single()
          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }
          sesion = updatedSesion
        } else {
          sesion = concurrentSesion
        }
      } else {
        return NextResponse.json({ error: sesionError.message }, { status: 500 })
      }
    } else if (!newSesion) {
      return NextResponse.json({ error: 'Error al crear la sesión' }, { status: 500 })
    } else {
      sesion = newSesion
      sesionEsNueva = true
    }
  }

  const { data: newNotes, error } = await supabase
    .from('patient_notes')
    .insert(
      entradas.map((entrada) => ({
        patient_id: params.id,
        organization_id: patientRow.organization_id,
        contenido: entrada.contenido,
        categoria: entrada.categoria,
        sesion_id: sesion!.id,
      }))
    )
    .select('id, contenido, categoria, created_at')

  if (error) {
    // Nettoyage : si l'insertion des notes échoue, ne pas laisser une session orpheline sans notes --
    // uniquement si on vient de la créer dans cet appel (jamais une session existante fusionnée, qui
    // a déjà ses propres notes).
    if (sesionEsNueva) {
      await supabase.from('patient_note_sesiones').delete().eq('id', sesion.id)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    notes: newNotes,
    sesionId: sesion.id,
    comentarioFinal: sesion.comentario_final,
    appointmentId,
  })
}
