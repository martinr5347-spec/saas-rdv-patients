import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createPaymentLink } from '@/lib/payments/mercadopago'
import { dispatch } from '@/lib/dispatcher'
import { toTenantDate, toTenantTime } from '@/lib/utils/timezone'

function verifyCalendlySignature(body: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(sigBuffer, expectedBuffer)
}

function extractUuidFromUri(uri: string) {
  const match = uri.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  return match?.[1] ?? null
}

function normalizeCalendlyUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

function matchCalendlyUrl(calendlyUrl: string, candidates: string[]) {
  const normalized = normalizeCalendlyUrl(calendlyUrl)
  return candidates.some((c) => normalizeCalendlyUrl(c).includes(normalized) || normalized.includes(normalizeCalendlyUrl(c)))
}

export async function POST(req: Request) {
  const body = await req.text()
  const secret = process.env.WEBHOOK_SECRET_CALENDLY

  if (secret) {
    const signature = req.headers.get('x-calendly-signature') ?? req.headers.get('x-calendly-webhook-signature')
    if (!signature || !verifyCalendlySignature(body, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = (payload as Record<string, unknown>).event
  const payloadData = ((payload as Record<string, unknown>).payload as Record<string, unknown>) ?? {}

  if (event !== 'invitee.created') {
    return NextResponse.json({ ok: true })
  }

  const eventObj = (payloadData.event as Record<string, unknown>) ?? {}
  const invitee = (payloadData.invitee as Record<string, unknown>) ?? {}
  const eventType = (payloadData.event_type as Record<string, unknown>) ?? {}

  const eventUri = typeof eventObj.uri === 'string' ? eventObj.uri : ''
  const eventTypeUri = typeof eventType.uri === 'string' ? eventType.uri : ''
  const eventTypeUrl = typeof eventType.url === 'string' ? eventType.url : ''
  const eventTypeSchedulingUrl = typeof eventType.scheduling_url === 'string' ? eventType.scheduling_url : ''
  const startTime = typeof eventObj.start_time === 'string' ? eventObj.start_time : ''

  const calendlyEventId = extractUuidFromUri(eventUri) ?? extractUuidFromUri(eventTypeUri)
  if (!calendlyEventId) {
    console.error('Calendly webhook: event id introuvable', { eventUri, eventTypeUri })
    return NextResponse.json({ error: 'Event id missing' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('calendly_event_id', calendlyEventId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  const { data: allSettings } = await supabase
    .from('org_settings')
    .select('organization_id, organizations(fuseau, langue), monto_acompte, mp_access_token, mp_notification_url, calendly_url')
    .not('calendly_url', 'is', null)

  const orgWithSettings = (allSettings ?? []).find((s) =>
    matchCalendlyUrl(s.calendly_url ?? '', [eventTypeUri, eventTypeUrl, eventTypeSchedulingUrl])
  )

  if (!orgWithSettings) {
    console.error('Calendly webhook: tenant introuvable pour', { eventTypeUri, eventTypeUrl, eventTypeSchedulingUrl })
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const organizationId = orgWithSettings.organization_id
  const orgData = orgWithSettings.organizations as { fuseau: string; langue: string } | null
  const fuseau = orgData?.fuseau ?? 'America/Lima'

  const patientName = typeof invitee.name === 'string' ? invitee.name : ''
  const patientEmail = typeof invitee.email === 'string' ? invitee.email : ''
  const patientPhone =
    typeof invitee.text_reminder_number === 'string'
      ? invitee.text_reminder_number
      : ''

  if (!patientName || (!patientEmail && !patientPhone)) {
    return NextResponse.json({ error: 'Missing patient data' }, { status: 400 })
  }

  const fechaCita = toTenantDate(startTime, fuseau)
  const horaCita = toTenantTime(startTime, fuseau)
  const montoAcompte = Number(orgWithSettings.monto_acompte) || 0

  let patientId: string | null = null
  if (patientPhone) {
    const { data: byPhone } = await supabase
      .from('patients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('telefono', patientPhone)
      .maybeSingle()
    if (byPhone) patientId = byPhone.id
  }
  if (!patientId && patientEmail) {
    const { data: byEmail } = await supabase
      .from('patients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', patientEmail)
      .maybeSingle()
    if (byEmail) patientId = byEmail.id
  }

  if (!patientId) {
    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert({
        organization_id: organizationId,
        nom: patientName,
        email: patientEmail || null,
        telefono: patientPhone || null,
      })
      .select('id')
      .single()

    if (patientError || !newPatient) {
      console.error('Calendly webhook: erreur création patient', patientError)
      return NextResponse.json({ error: 'Patient creation failed' }, { status: 500 })
    }
    patientId = newPatient.id
  }

  const externalRef = crypto.randomUUID()

  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      organization_id: organizationId,
      patient_id: patientId,
      fecha_cita: fechaCita,
      hora_cita: horaCita,
      statut: 'pendiente',
      monto_acompte: montoAcompte,
      calendly_event_id: calendlyEventId,
      mp_external_ref: externalRef,
    })
    .select('id, monto_acompte, mp_external_ref')
    .single()

  if (apptError || !appointment) {
    console.error('Calendly webhook: erreur création appointment', apptError)
    return NextResponse.json({ error: 'Appointment creation failed' }, { status: 500 })
  }

  let linkPago: string | null = null
  let mpPreferenceId: string | null = null

  try {
    const accessToken = orgWithSettings.mp_access_token || process.env.MP_ACCESS_TOKEN_TEST
    if (!accessToken) {
      console.warn('Calendly webhook: aucun token MercadoPago disponible')
    } else {
      const notificationUrl =
        orgWithSettings.mp_notification_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`
      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments`
      const mpResult = await createPaymentLink({
        accessToken,
        externalRef,
        amount: montoAcompte,
        patientName,
        notificationUrl,
        successUrl,
      })
      linkPago = mpResult.initPoint
      mpPreferenceId = mpResult.preferenceId
    }
  } catch (e) {
    console.error('Calendly webhook: erreur création lien MercadoPago', e)
  }

  if (linkPago) {
    await supabase
      .from('appointments')
      .update({ link_pago: linkPago, mp_preference_id: mpPreferenceId })
      .eq('id', appointment.id)
  }

  try {
    await dispatch({
      appointmentId: appointment.id,
      organizationId,
      type: 'confirmation',
    })
  } catch (e) {
    console.error('Calendly webhook: erreur dispatch confirmation', e)
  }

  return NextResponse.json({ ok: true, appointmentId: appointment.id })
}
