import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { calcularSlotsDelDia } from '@/lib/booking/calcularSlots'
import { createPaymentLink } from '@/lib/payments/mercadopago'
import { dispatch } from '@/lib/dispatcher'
import { ahoraEnFuseau } from '@/lib/utils/timezone'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'

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

function normalizarTelefono(indicativo: string, numero: string): string {
  const digitos = numero.replace(/\D/g, '')
  return `${indicativo}${digitos}`
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const supabase = createServiceRoleClient()
  const body = await req.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const fecha = typeof body.fecha === 'string' ? body.fecha : ''
  const hora = typeof body.hora === 'string' ? body.hora : ''
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 120) : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const indicativo = typeof body.indicativo === 'string' ? body.indicativo : ''
  const telefonoNumero = typeof body.telefonoNumero === 'string' ? body.telefonoNumero : ''

  // Revalidation serveur -- ne jamais faire confiance aux validations deja faites cote client.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
    return NextResponse.json({ error: 'Fecha u hora inválida' }, { status: 400 })
  }
  if (!nombre) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!/^\+\d{1,4}$/.test(indicativo) || telefonoNumero.replace(/\D/g, '').length < 6) {
    return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 })
  }
  const telefono = normalizarTelefono(indicativo, telefonoNumero)

  // IMPORTANT : jamais select('*') -- memes colonnes non sensibles que le GET, plus celles
  // necessaires au paiement (mp_access_token, mp_notification_url) puisque ce POST cree
  // reellement le RDV et le lien de paiement, contrairement au GET qui ne faisait qu'afficher.
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
    .select(
      'duracion_cita_min, buffer_min, anticipacion_min_horas, anticipacion_max_dias, monto_acompte, monnaie, mp_access_token, mp_notification_url'
    )
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!settings) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  // Re-verification que le creneau est toujours disponible (confort -- message d'erreur clair et
  // rapide dans le cas courant). La vraie garantie contre la concurrence, c'est la contrainte
  // d'exclusion Postgres plus bas, pas cette verification.
  const { data: franjas } = await supabase.from('org_availability').select('dia_semana, hora_inicio, hora_fin').eq('organization_id', org.id)
  const { data: bloqueadas } = await supabase.from('org_blocked_dates').select('fecha').eq('organization_id', org.id)
  const { data: citasExistentes } = await supabase
    .from('appointments')
    .select('fecha_cita, hora_cita, hora_fin')
    .eq('organization_id', org.id)
    .eq('fecha_cita', fecha)
    .neq('statut', 'anulado')

  const ahoraLocal = ahoraEnFuseau(org.fuseau)

  const slotsDisponibles = calcularSlotsDelDia(
    fecha,
    (franjas ?? []).map((f) => ({ diaSemana: f.dia_semana, horaInicio: f.hora_inicio.slice(0, 5), horaFin: f.hora_fin.slice(0, 5) })),
    bloqueadas ?? [],
    (citasExistentes ?? []).map((c) => ({ fecha: c.fecha_cita, horaInicio: c.hora_cita.slice(0, 5), horaFin: c.hora_fin?.slice(0, 5) ?? null })),
    {
      duracionCitaMin: settings.duracion_cita_min,
      bufferMin: settings.buffer_min,
      anticipacionMinHoras: settings.anticipacion_min_horas,
      anticipacionMaxDias: settings.anticipacion_max_dias,
    },
    ahoraLocal
  )

  if (!slotsDisponibles.includes(hora)) {
    return NextResponse.json({ error: 'Este horario ya no está disponible, elige otro.' }, { status: 409 })
  }

  // Dedup patient -- meme ordre que le webhook Calendly : telefono d'abord, email ensuite.
  let patientId: string | null = null
  const { data: byPhone } = await supabase.from('patients').select('id').eq('organization_id', org.id).eq('telefono', telefono).maybeSingle()
  if (byPhone) patientId = byPhone.id
  if (!patientId) {
    const { data: byEmail } = await supabase.from('patients').select('id').eq('organization_id', org.id).eq('email', email).maybeSingle()
    if (byEmail) patientId = byEmail.id
  }
  if (!patientId) {
    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert({ organization_id: org.id, nom: nombre, email, telefono })
      .select('id')
      .single()
    if (patientError || !newPatient) {
      // Violation de la contrainte unique (organization_id, telefono/email) -- deux requetes
      // concurrentes pour le MEME nouveau patient (ex. double-clic ou deux onglets). Pas une
      // vraie erreur : l'autre requete a cree le patient entre notre lookup et notre insert,
      // on le recupere au lieu d'echouer.
      if (patientError?.code === '23505') {
        const { data: retryPhone } = await supabase.from('patients').select('id').eq('organization_id', org.id).eq('telefono', telefono).maybeSingle()
        const { data: retryEmail } = !retryPhone
          ? await supabase.from('patients').select('id').eq('organization_id', org.id).eq('email', email).maybeSingle()
          : { data: null }
        patientId = retryPhone?.id ?? retryEmail?.id ?? null
      }
      if (!patientId) {
        return NextResponse.json({ error: 'No se pudo crear el paciente' }, { status: 500 })
      }
    } else {
      patientId = newPatient.id
    }
  }

  const montoAcompte = Number(settings.monto_acompte) || 0
  const statutInicial = montoAcompte > 0 ? 'pendiente' : 'confirmado'
  const externalRef = crypto.randomUUID()

  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      organization_id: org.id,
      patient_id: patientId,
      fecha_cita: fecha,
      hora_cita: hora,
      statut: statutInicial,
      monto_acompte: montoAcompte,
      mp_external_ref: externalRef,
    })
    .select('id')
    .single()

  if (apptError) {
    // Code Postgres de violation de contrainte d'exclusion -- la vraie protection anti-collision
    // (migration 033), pas la revalidation applicative ci-dessus qui n'est qu'un confort UX.
    if (apptError.code === '23P01') {
      return NextResponse.json({ error: 'Este horario acaba de ser reservado por otra persona, elige otro horario.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo crear la cita' }, { status: 500 })
  }

  let linkPago: string | null = null
  if (montoAcompte > 0) {
    try {
      // settings.mp_access_token est chiffre en base (voir lib/crypto/settingsEncryption.ts) --
      // le repli process.env.MP_ACCESS_TOKEN_TEST, lui, est deja en clair et ne doit jamais
      // passer par decryptSecret(). Deja a l'interieur du try/catch englobant : un echec de
      // dechiffrement (ex. valeur legacy encore en clair, non migree) degrade proprement vers
      // "pas de lien de paiement" plutot que de faire planter toute la reservation.
      const accessToken = settings.mp_access_token ? decryptSecret(settings.mp_access_token) : process.env.MP_ACCESS_TOKEN_TEST
      if (accessToken) {
        const notificationUrl = settings.mp_notification_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`
        const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reservar/${params.slug}`
        const mpResult = await createPaymentLink({
          accessToken,
          externalRef,
          amount: montoAcompte,
          currency: settings.monnaie || 'PEN',
          patientName: nombre,
          notificationUrl,
          successUrl,
        })
        linkPago = mpResult.initPoint
        if (linkPago) {
          await supabase.from('appointments').update({ link_pago: linkPago, mp_preference_id: mpResult.preferenceId }).eq('id', appointment.id)
        }
      }
    } catch (e) {
      console.error('Reserva pública: erreur création lien MercadoPago', e)
    }
  }

  try {
    await dispatch({ appointmentId: appointment.id, organizationId: org.id, type: 'confirmation' })
  } catch (e) {
    console.error('Reserva pública: erreur dispatch confirmation', e)
  }

  return NextResponse.json({ ok: true, linkPago })
}
