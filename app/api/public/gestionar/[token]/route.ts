import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { calcularSlotsDelDia } from '@/lib/booking/calcularSlots'
import { dispatch } from '@/lib/dispatcher'
import { ahoraEnFuseau, tenantDateTimeToUtc } from '@/lib/utils/timezone'

// IMPORTANT : toujours chercher le RDV par gestion_token, jamais par appointments.id -- l'id
// interne ne doit jamais servir de capacite d'acces public (voir migration 034).
async function loadAppointmentByToken(supabase: ReturnType<typeof createServiceRoleClient>, token: string) {
  return supabase
    .from('appointments')
    .select(
      'id, organization_id, fecha_cita, hora_cita, hora_fin, statut, organizations(nom, slug, fuseau, langue, org_settings(anticipacion_min_horas))'
    )
    .eq('gestion_token', token)
    .maybeSingle()
}

function puedeAutogestionar(fechaCita: string, horaCita: string, fuseau: string, anticipacionMinHoras: number): boolean {
  const apptUtc = tenantDateTimeToUtc(fechaCita, horaCita, fuseau)
  const limiteMs = anticipacionMinHoras * 60 * 60 * 1000
  return apptUtc.getTime() - Date.now() >= limiteMs
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()

  const { data: appt } = await loadAppointmentByToken(supabase, params.token)

  if (!appt) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const org = appt.organizations as unknown as {
    nom: string
    slug: string | null
    fuseau: string
    langue: string
    org_settings: { anticipacion_min_horas: number } | null
  } | null

  if (!org) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const yaAnulado = appt.statut === 'anulado'
  const anticipacionMinHoras = org.org_settings?.anticipacion_min_horas ?? 2
  const puedeGestionar = !yaAnulado && puedeAutogestionar(appt.fecha_cita, appt.hora_cita, org.fuseau, anticipacionMinHoras)

  return NextResponse.json({
    organizacion: { nom: org.nom, slug: org.slug, langue: org.langue },
    fechaCita: appt.fecha_cita,
    horaCita: appt.hora_cita.slice(0, 5),
    statut: appt.statut,
    yaAnulado,
    puedeGestionar,
  })
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()
  const body = await req.json().catch(() => null)

  if (!body || (body.action !== 'cancelar' && body.action !== 'reprogramar')) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { data: appt } = await loadAppointmentByToken(supabase, params.token)

  if (!appt) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const org = appt.organizations as unknown as {
    nom: string
    slug: string | null
    fuseau: string
    langue: string
    org_settings: { anticipacion_min_horas: number } | null
  } | null

  if (!org) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (appt.statut === 'anulado') {
    return NextResponse.json({ error: 'Esta cita ya fue cancelada.' }, { status: 409 })
  }

  const anticipacionMinHoras = org.org_settings?.anticipacion_min_horas ?? 2

  if (body.action === 'cancelar') {
    if (!puedeAutogestionar(appt.fecha_cita, appt.hora_cita, org.fuseau, anticipacionMinHoras)) {
      return NextResponse.json({ error: 'Ya no es posible cancelar esta cita por este medio.' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ statut: 'anulado' })
      .eq('gestion_token', params.token)
      .neq('statut', 'anulado')

    if (updateError) {
      return NextResponse.json({ error: 'No se pudo cancelar la cita' }, { status: 500 })
    }

    try {
      await dispatch({ appointmentId: appt.id, organizationId: appt.organization_id, type: 'cambio_praticien', cancelado: true })
    } catch (e) {
      console.error('Gestión paciente: erreur dispatch cambio_praticien (cancelación)', e)
    }

    return NextResponse.json({ ok: true })
  }

  // action === 'reprogramar'
  if (!puedeAutogestionar(appt.fecha_cita, appt.hora_cita, org.fuseau, anticipacionMinHoras)) {
    return NextResponse.json({ error: 'Ya no es posible reprogramar esta cita por este medio.' }, { status: 403 })
  }

  const fecha = typeof body.fecha === 'string' ? body.fecha : ''
  const hora = typeof body.hora === 'string' ? body.hora : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ error: 'Fecha u hora inválida' }, { status: 400 })
  }

  const { data: settingsRow } = await supabase
    .from('org_settings')
    .select('duracion_cita_min, buffer_min, anticipacion_min_horas, anticipacion_max_dias')
    .eq('organization_id', appt.organization_id)
    .maybeSingle()

  if (!settingsRow) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const { data: franjas } = await supabase
    .from('org_availability')
    .select('dia_semana, hora_inicio, hora_fin')
    .eq('organization_id', appt.organization_id)
  const { data: bloqueadas } = await supabase
    .from('org_blocked_dates')
    .select('fecha')
    .eq('organization_id', appt.organization_id)
  const { data: citasExistentes } = await supabase
    .from('appointments')
    .select('fecha_cita, hora_cita, hora_fin')
    .eq('organization_id', appt.organization_id)
    .eq('fecha_cita', fecha)
    .neq('statut', 'anulado')
    .neq('id', appt.id) // le RDV courant ne doit pas se bloquer lui-meme dans le calcul des creneaux
  const { data: overrides } = await supabase
    .from('org_availability_overrides')
    .select('fecha, hora_inicio, hora_fin')
    .eq('organization_id', appt.organization_id)
    .eq('fecha', fecha)

  const ahoraLocal = ahoraEnFuseau(org.fuseau)

  const slotsDisponibles = calcularSlotsDelDia(
    fecha,
    (franjas ?? []).map((f) => ({ diaSemana: f.dia_semana, horaInicio: f.hora_inicio.slice(0, 5), horaFin: f.hora_fin.slice(0, 5) })),
    bloqueadas ?? [],
    (citasExistentes ?? []).map((c) => ({ fecha: c.fecha_cita, horaInicio: c.hora_cita.slice(0, 5), horaFin: c.hora_fin?.slice(0, 5) ?? null })),
    {
      duracionCitaMin: settingsRow.duracion_cita_min,
      bufferMin: settingsRow.buffer_min,
      anticipacionMinHoras: settingsRow.anticipacion_min_horas,
      anticipacionMaxDias: settingsRow.anticipacion_max_dias,
    },
    ahoraLocal,
    (overrides ?? []).map((o) => ({ fecha: o.fecha, horaInicio: o.hora_inicio.slice(0, 5), horaFin: o.hora_fin.slice(0, 5) }))
  )

  if (!slotsDisponibles.includes(hora)) {
    return NextResponse.json({ error: 'Este horario ya no está disponible, elige otro.' }, { status: 409 })
  }

  // Preserve la duree existante (RDV redimensionne manuellement depuis le calendrier interne) --
  // ne jamais la reinitialiser a la duree par defaut.
  let nuevaHoraFin: string | null = null
  if (appt.hora_fin) {
    const [hOrig, mOrig] = appt.hora_cita.split(':').map(Number)
    const [hFin, mFin] = appt.hora_fin.split(':').map(Number)
    const duracionMin = hFin * 60 + mFin - (hOrig * 60 + mOrig)
    const [hNueva, mNueva] = hora.split(':').map(Number)
    const finMin = hNueva * 60 + mNueva + duracionMin
    nuevaHoraFin = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`
  }

  const { error: updateError } = await supabase
    .from('appointments')
    .update({ fecha_cita: fecha, hora_cita: hora, hora_fin: nuevaHoraFin })
    .eq('gestion_token', params.token)

  if (updateError) {
    // Code Postgres de violation de contrainte d'exclusion (migration 033) -- meme garantie
    // anti-collision qu'une creation de RDV, appliquee ici par Postgres lui-meme sur l'UPDATE.
    if (updateError.code === '23P01') {
      return NextResponse.json({ error: 'Este horario acaba de ser reservado por otra persona, elige otro horario.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo reprogramar la cita' }, { status: 500 })
  }

  try {
    await dispatch({ appointmentId: appt.id, organizationId: appt.organization_id, type: 'reprogramacion' })
    await dispatch({ appointmentId: appt.id, organizationId: appt.organization_id, type: 'cambio_praticien', cancelado: false })
  } catch (e) {
    console.error('Gestión paciente: erreur dispatch reprogramacion/cambio_praticien', e)
  }

  return NextResponse.json({ ok: true })
}
