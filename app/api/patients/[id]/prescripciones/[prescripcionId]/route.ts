import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PrescripcionMedicamento } from '@/lib/pdf/prescripcionPdf'
import { parsePrescripcionBody } from '@/lib/patients/prescripcionBody'
import type { Json } from '@/types/database'

// PUT = met a jour fecha/medicamentos/notasAdicionales d'un brouillon (storage_path null).
// Refuse toute modification d'une prescription deja validee -- cf. prompt prescripciones-borrador :
// seule la suppression reste possible dessus a partir de ce moment-la.
export async function PUT(req: Request, { params }: { params: { id: string; prescripcionId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: prescripcionRow } = await supabase
    .from('prescripciones')
    .select('id, storage_path')
    .eq('id', params.prescripcionId)
    .eq('patient_id', params.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!prescripcionRow) {
    return NextResponse.json({ error: 'Prescripción no encontrada' }, { status: 404 })
  }
  if (prescripcionRow.storage_path !== null) {
    return NextResponse.json({ error: 'No se puede modificar una prescripción ya generada' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = parsePrescripcionBody(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { fecha, medicamentos, notasAdicionales } = parsed

  const { data: updated, error: updateError } = await supabase
    .from('prescripciones')
    .update({ fecha, medicamentos: medicamentos as unknown as Json, notas_adicionales: notasAdicionales })
    .eq('id', params.prescripcionId)
    .eq('organization_id', profile.organization_id)
    .select('id, fecha, medicamentos, notas_adicionales, created_at')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? 'Error al actualizar la prescripción' }, { status: 500 })
  }

  return NextResponse.json({
    prescripcion: {
      id: updated.id,
      fecha: updated.fecha,
      medicamentos: (updated.medicamentos as unknown as PrescripcionMedicamento[] | null) ?? [],
      notasAdicionales: updated.notas_adicionales,
      esBorrador: true,
      createdAt: updated.created_at,
    },
  })
}

// DELETE = supprime la ligne, et si storage_path est renseigne, le fichier correspondant dans
// 'recetas-anteriores' -- aucune des deux ne doit survivre sans l'autre (brouillon : rien a
// nettoyer cote storage).
export async function DELETE(req: Request, { params }: { params: { id: string; prescripcionId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: prescripcionRow } = await supabase
    .from('prescripciones')
    .select('id, storage_path')
    .eq('id', params.prescripcionId)
    .eq('patient_id', params.id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!prescripcionRow) {
    return NextResponse.json({ error: 'Prescripción no encontrada' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('prescripciones')
    .delete()
    .eq('id', params.prescripcionId)
    .eq('organization_id', profile.organization_id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (prescripcionRow.storage_path) {
    await supabase.storage.from('recetas-anteriores').remove([prescripcionRow.storage_path])
  }

  return NextResponse.json({ ok: true })
}
