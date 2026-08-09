import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { verifyMercadoPagoWebhook } from '@/lib/payments/mercadopago'
import { dispatch } from '@/lib/dispatcher'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('data_id') ?? url.searchParams.get('id')
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  const secret = process.env.WEBHOOK_SECRET_MERCADOPAGO
  if (secret && dataId) {
    if (!verifyMercadoPagoWebhook(xSignature, xRequestId, dataId, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = (payload as Record<string, unknown>) ?? {}
  const externalRef =
    typeof data.external_reference === 'string' ? data.external_reference : null
  const status = typeof data.status === 'string' ? data.status : null

  if (!externalRef) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceRoleClient()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, organization_id, monto_acompte, statut')
    .eq('mp_external_ref', externalRef)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  if (appointment.statut === 'pagado') {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  if (status !== 'approved') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const transactionAmount =
    typeof (data as { transaction_amount?: unknown }).transaction_amount === 'number'
      ? (data as { transaction_amount: number }).transaction_amount
      : Number(appointment.monto_acompte)

  if (transactionAmount !== Number(appointment.monto_acompte)) {
    console.error('Montant MercadoPago inattendu', {
      expected: appointment.monto_acompte,
      received: transactionAmount,
      appointmentId: appointment.id,
    })
    return NextResponse.json({ ok: true, warning: 'amount mismatch' })
  }

  const { error: updateError } = await supabase
    .from('appointments')
    .update({ statut: 'pagado', fecha_pago: new Date().toISOString() })
    .eq('id', appointment.id)

  if (updateError) {
    console.error('MercadoPago webhook: erreur update appointment', updateError)
    return NextResponse.json({ ok: true })
  }

  await supabase.from('payments').insert({
    appointment_id: appointment.id,
    montant: transactionAmount,
    moyen: 'mercadopago',
    statut: 'approved',
    provider_ref: String(data.id ?? ''),
  })

  try {
    await dispatch({
      appointmentId: appointment.id,
      organizationId: appointment.organization_id,
      type: 'pago',
    })
    await dispatch({
      appointmentId: appointment.id,
      organizationId: appointment.organization_id,
      type: 'pago_praticien',
    })
  } catch (e) {
    console.error('MercadoPago webhook: erreur dispatch', e)
  }

  return NextResponse.json({ ok: true })
}
