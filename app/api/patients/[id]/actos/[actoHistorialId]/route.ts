import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT/DELETE d'une ligne actos_realizados -- uniquement origen 'acto' (saisie a la main). Les
// lignes origen 'mercadopago' (fusionnees depuis appointments.statut='pagado', cf. GET de la route
// parente) n'existent jamais dans cette table : un id mercadopago ne matchera simplement aucune
// ligne ci-dessous, d'ou le 404 naturel sans cas particulier a coder.
async function getOrganizationId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  return profile?.organization_id ?? null
}

// PUT = met a jour uniquement monto/fecha/metodo_pago -- jamais acto_id/acto_texto_libre (changer
// quel acte c'est est trop structurel pour une edition inline, cf. prompt : supprimer + recreer).
export async function PUT(req: Request, { params }: { params: { id: string; actoHistorialId: string } }) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('actos_realizados')
    .select('id, acto_id, acto_texto_libre, appointment_id')
    .eq('id', params.actoHistorialId)
    .eq('patient_id', params.id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Acto no encontrado' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const monto = Number(body.monto)
  const fecha = body.fecha as string | undefined
  const metodoPago = body.metodoPago as string | undefined

  if (!Number.isFinite(monto) || monto < 0) {
    return NextResponse.json({ error: 'Ingresa un monto válido' }, { status: 400 })
  }
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }
  if (!['efectivo', 'transferencia', 'otro'].includes(metodoPago ?? '')) {
    return NextResponse.json({ error: 'Selecciona un medio de pago' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('actos_realizados')
    .update({ monto, fecha, metodo_pago: metodoPago as 'efectivo' | 'transferencia' | 'otro' })
    .eq('id', params.actoHistorialId)
    .eq('organization_id', organizationId)
    .select('id, monto, fecha, appointment_id, metodo_pago, acto_texto_libre, actos(nombre)')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? 'Error al actualizar el acto' }, { status: 500 })
  }

  return NextResponse.json({
    acto: {
      id: updated.id,
      monto: Number(updated.monto),
      fecha: updated.fecha,
      appointmentId: updated.appointment_id,
      nombre: (updated.actos as unknown as { nombre: string } | null)?.nombre ?? updated.acto_texto_libre ?? '',
      metodoPago: updated.metodo_pago as 'efectivo' | 'transferencia' | 'otro',
      origen: 'acto' as const,
    },
  })
}

// DELETE = supprime la ligne, verifie patient_id/organization_id avant (meme pattern que la route
// prescripciones).
export async function DELETE(req: Request, { params }: { params: { id: string; actoHistorialId: string } }) {
  const supabase = createClient()
  const organizationId = await getOrganizationId(supabase)
  if (!organizationId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('actos_realizados')
    .select('id')
    .eq('id', params.actoHistorialId)
    .eq('patient_id', params.id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Acto no encontrado' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('actos_realizados')
    .delete()
    .eq('id', params.actoHistorialId)
    .eq('organization_id', organizationId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
