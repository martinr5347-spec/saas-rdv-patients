import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createPaymentLink } from '@/lib/payments/mercadopago'
import { dispatch, alertAdminEmail } from '@/lib/dispatcher'
import { toTenantDate, toTenantTime } from '@/lib/utils/timezone'

// Calendly signe au format "t=<timestamp>,v1=<hmac>" sur le contenu "<timestamp>.<body>",
// exactement comme Stripe. Le header s'appelle Calendly-Webhook-Signature (pas de préfixe "x-").
function verifyCalendlySignature(body: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [key, value] = p.split('=')
      return [key, value]
    })
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
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
  if (!normalized) return false
  return candidates
    .filter((c) => c.length > 0)
    .map((c) => normalizeCalendlyUrl(c))
    .filter((c) => c.length > 0)
    .some((c) => c.includes(normalized) || normalized.includes(c))
}

// Le numéro WhatsApp du patient arrive soit via le champ SMS intégré de Calendly
// (invitee.text_reminder_number), soit via une question personnalisée du formulaire
// (ex: "Número de celular (WhatsApp)") — selon comment chaque cabinet a configuré son
// Calendly. On normalise dans les deux cas pour un format cohérent en base (utile pour
// la déduplication des patients par téléphone) : uniquement chiffres + un éventuel "+"
// en tête, +51 (Pérou) par défaut si aucun indicatif n'est fourni.
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/(?!^\+)[^\d]/g, '')
  if (!cleaned) return ''
  return cleaned.startsWith('+') ? cleaned : `+51${cleaned}`
}

function extractPhoneFromAnswers(questionsAndAnswers: unknown): string {
  if (!Array.isArray(questionsAndAnswers)) return ''
  const match = questionsAndAnswers.find((qa) => {
    const question = typeof (qa as { question?: unknown })?.question === 'string' ? (qa as { question: string }).question : ''
    const label = question.toLowerCase()
    return label.includes('whatsapp') || label.includes('celular')
  }) as { answer?: unknown } | undefined
  const answer = typeof match?.answer === 'string' ? match.answer : ''
  return answer
}

export async function POST(req: Request) {
  const body = await req.text()
  const secret = process.env.WEBHOOK_SECRET_CALENDLY

  if (secret) {
    const signature = req.headers.get('calendly-webhook-signature')
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
  const endTime = typeof eventObj.end_time === 'string' ? eventObj.end_time : ''

  const calendlyEventId = extractUuidFromUri(eventUri) ?? extractUuidFromUri(eventTypeUri)
  if (!calendlyEventId) {
    console.error('Calendly webhook: event id introuvable', { eventUri, eventTypeUri })
    await alertAdminEmail('Webhook Calendly : event id introuvable', `<pre>${JSON.stringify({ eventUri, eventTypeUri })}</pre>`)
    return NextResponse.json({ ok: true, error: 'Event id missing' })
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
    .select('organization_id, organizations(fuseau, langue), monto_acompte, monnaie, mp_access_token, mp_notification_url, calendly_url')
    .not('calendly_url', 'is', null)

  const orgWithSettings = (allSettings ?? []).find((s) =>
    matchCalendlyUrl(s.calendly_url ?? '', [eventTypeUri, eventTypeUrl, eventTypeSchedulingUrl])
  )

  if (!orgWithSettings) {
    console.error('Calendly webhook: tenant introuvable pour', { eventTypeUri, eventTypeUrl, eventTypeSchedulingUrl })
    await alertAdminEmail(
      'Webhook Calendly : cabinet introuvable',
      `<pre>${JSON.stringify({ eventTypeUri, eventTypeUrl, eventTypeSchedulingUrl })}</pre>`
    )
    return NextResponse.json({ ok: true, error: 'Tenant not found' })
  }

  const organizationId = orgWithSettings.organization_id
  const orgData = orgWithSettings.organizations as { fuseau: string; langue: string } | null
  const fuseau = orgData?.fuseau ?? 'America/Lima'

  const patientName = typeof invitee.name === 'string' ? invitee.name : ''
  const patientEmail = typeof invitee.email === 'string' ? invitee.email : ''

  // Le numéro peut venir du champ SMS intégré de Calendly, ou d'une question
  // personnalisée du formulaire ("Número de celular (WhatsApp)") selon le cabinet —
  // on vérifie les deux emplacements possibles de questions_and_answers.
  const rawPhone =
    (typeof invitee.text_reminder_number === 'string' ? invitee.text_reminder_number : '') ||
    extractPhoneFromAnswers(payloadData.questions_and_answers) ||
    extractPhoneFromAnswers(invitee.questions_and_answers)
  const patientPhone = rawPhone ? normalizePhone(rawPhone) : ''

  if (!patientName || (!patientEmail && !patientPhone)) {
    console.error('Calendly webhook: données patient manquantes', { patientName, patientEmail, patientPhone })
    await alertAdminEmail(
      'Webhook Calendly : données patient manquantes',
      `<pre>${JSON.stringify({ patientName, patientEmail, patientPhone, calendlyEventId })}</pre>`
    )
    return NextResponse.json({ ok: true, error: 'Missing patient data' })
  }

  const fechaCita = toTenantDate(startTime, fuseau)
  const horaCita = toTenantTime(startTime, fuseau)
  const horaFin = endTime ? toTenantTime(endTime, fuseau) : null
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
      await alertAdminEmail('Webhook Calendly : erreur création patient', `<pre>${String(patientError?.message)}</pre>`)
      return NextResponse.json({ ok: true, error: 'Patient creation failed' })
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
      hora_fin: horaFin,
      statut: 'pendiente',
      monto_acompte: montoAcompte,
      calendly_event_id: calendlyEventId,
      mp_external_ref: externalRef,
    })
    .select('id, monto_acompte, mp_external_ref')
    .single()

  if (apptError || !appointment) {
    console.error('Calendly webhook: erreur création appointment', apptError)
    await alertAdminEmail('Webhook Calendly : erreur création RDV', `<pre>${String(apptError?.message)}</pre>`)
    return NextResponse.json({ ok: true, error: 'Appointment creation failed' })
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
        currency: orgWithSettings.monnaie || 'PEN',
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
