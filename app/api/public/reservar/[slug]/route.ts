import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { calcularSlotsDelDia } from '@/lib/booking/calcularSlots'

function ahoraEnFuseau(fuseau: string): { fecha: string; minutosDesdeMedianoche: number } {
  // Intl.DateTimeFormat gere nativement les fuseaux IANA sans dependance supplementaire.
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuseau,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00'
  const fecha = `${get('year')}-${get('month')}-${get('day')}`
  const minutosDesdeMedianoche = Number(get('hour')) * 60 + Number(get('minute'))
  return { fecha, minutosDesdeMedianoche }
}

// Ajoute des jours a une date 'YYYY-MM-DD' en arithmetique UTC explicite -- new Date(`${fecha}T00:00:00`)
// dependrait du fuseau local du processus Node qui execute cette route, pas de celui de l'organisation ;
// Date.UTC() + toISOString() est deterministe quel que soit l'environnement d'execution.
function addDiasUtc(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const resultado = new Date(Date.UTC(y, m - 1, d + dias))
  return resultado.toISOString().slice(0, 10)
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const supabase = createServiceRoleClient()
  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get('fecha')
  const mesParam = searchParams.get('mes')

  if (!fechaParam && !mesParam) {
    return NextResponse.json({ error: 'Parámetro fecha o mes requerido' }, { status: 400 })
  }

  // IMPORTANT : jamais select('*') sur organizations/org_settings dans une route publique --
  // uniquement les colonnes non sensibles necessaires a l'affichage et au calcul.
  const { data: org } = await supabase
    .from('organizations')
    .select('id, nom, fuseau, langue')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const { data: settings } = await supabase
    .from('org_settings')
    .select('duracion_cita_min, buffer_min, anticipacion_min_horas, anticipacion_max_dias')
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!settings) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const { data: franjas } = await supabase
    .from('org_availability')
    .select('dia_semana, hora_inicio, hora_fin')
    .eq('organization_id', org.id)

  const { data: bloqueadas } = await supabase
    .from('org_blocked_dates')
    .select('fecha')
    .eq('organization_id', org.id)

  const franjasMapeadas = (franjas ?? []).map((f) => ({
    diaSemana: f.dia_semana,
    horaInicio: f.hora_inicio.slice(0, 5),
    horaFin: f.hora_fin.slice(0, 5),
  }))

  const ahoraLocal = ahoraEnFuseau(org.fuseau)
  const hoy = ahoraLocal.fecha
  const maxFechaStr = addDiasUtc(hoy, settings.anticipacion_max_dias)

  const parametros = {
    duracionCitaMin: settings.duracion_cita_min,
    bufferMin: settings.buffer_min,
    anticipacionMinHoras: settings.anticipacion_min_horas,
    anticipacionMaxDias: settings.anticipacion_max_dias,
  }

  if (fechaParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    if (fechaParam < hoy || fechaParam > maxFechaStr) {
      return NextResponse.json({ slots: [] })
    }

    const { data: citas } = await supabase
      .from('appointments')
      .select('fecha_cita, hora_cita, hora_fin')
      .eq('organization_id', org.id)
      .eq('fecha_cita', fechaParam)
      .neq('statut', 'anulado')

    const slots = calcularSlotsDelDia(
      fechaParam,
      franjasMapeadas,
      bloqueadas ?? [],
      (citas ?? []).map((c) => ({ fecha: c.fecha_cita, horaInicio: c.hora_cita.slice(0, 5), horaFin: c.hora_fin?.slice(0, 5) ?? null })),
      parametros,
      ahoraLocal
    )

    return NextResponse.json({ slots })
  }

  // Mode mes : un seul aller-retour DB pour les citas/bloqueadas du mois entier, puis boucle en memoire
  // (pas de requete par jour -- important pour la performance).
  if (!/^\d{4}-\d{2}$/.test(mesParam!)) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }
  const primerDia = `${mesParam}-01`
  const [anioMes, mesMes] = mesParam!.split('-').map(Number)
  const ultimoDiaDate = new Date(Date.UTC(anioMes, mesMes, 0)) // jour 0 du mois suivant = dernier jour de ce mois
  const ultimoDia = ultimoDiaDate.toISOString().slice(0, 10)

  const { data: citasMes } = await supabase
    .from('appointments')
    .select('fecha_cita, hora_cita, hora_fin')
    .eq('organization_id', org.id)
    .gte('fecha_cita', primerDia)
    .lte('fecha_cita', ultimoDia)
    .neq('statut', 'anulado')

  const citasMapeadas = (citasMes ?? []).map((c) => ({
    fecha: c.fecha_cita,
    horaInicio: c.hora_cita.slice(0, 5),
    horaFin: c.hora_fin?.slice(0, 5) ?? null,
  }))

  const diasConDisponibilidad: string[] = []
  let fechaCursor = primerDia
  while (fechaCursor <= ultimoDia) {
    if (fechaCursor >= hoy && fechaCursor <= maxFechaStr) {
      const slots = calcularSlotsDelDia(fechaCursor, franjasMapeadas, bloqueadas ?? [], citasMapeadas, parametros, ahoraLocal)
      if (slots.length > 0) diasConDisponibilidad.push(fechaCursor)
    }
    fechaCursor = addDiasUtc(fechaCursor, 1)
  }

  return NextResponse.json({
    organizacion: { nom: org.nom, langue: org.langue },
    dias: diasConDisponibilidad,
    // Permet au client de borner la navigation prev/next du calendrier sans deviner --
    // ni hoy ni maxFecha ne sont des donnees sensibles.
    hoy,
    maxFecha: maxFechaStr,
  })
}
