import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(*), payments(*), notifications(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ appointment: data })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))

  const updateData: Pick<
    AppointmentUpdate,
    'statut' | 'presente' | 'montant_consultation' | 'concepto_consultation' | 'hora_fin'
  > = {}

  if (body.statut !== undefined) {
    const statuts = ['pendiente', 'confirmado', 'en_curso', 'pagado', 'anulado'] as const
    if (!statuts.includes(body.statut as typeof statuts[number])) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    updateData.statut = body.statut
  }

  if (body.presente !== undefined) {
    if (body.presente !== true && body.presente !== false && body.presente !== null) {
      return NextResponse.json({ error: 'Présence invalide' }, { status: 400 })
    }
    updateData.presente = body.presente
  }

  if (body.montant_consultation !== undefined) {
    if (
      body.montant_consultation !== null &&
      (isNaN(Number(body.montant_consultation)) || Number(body.montant_consultation) < 0)
    ) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }
    updateData.montant_consultation = body.montant_consultation === null ? null : Number(body.montant_consultation)
  }

  if (body.concepto_consultation !== undefined) {
    const concepto = body.concepto_consultation === null ? null : String(body.concepto_consultation).trim().slice(0, 120)
    updateData.concepto_consultation = concepto || null
  }

  if (body.hora_fin !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(body.hora_fin)) {
      return NextResponse.json({ error: 'Hora inválida' }, { status: 400 })
    }
    // Ne jamais faire confiance a une hora_cita envoyee par le client -- relire la vraie valeur en base.
    const { data: existing } = await supabase.from('appointments').select('hora_cita').eq('id', params.id).maybeSingle()
    if (!existing) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }
    if (`${body.hora_fin}:00` <= existing.hora_cita) {
      return NextResponse.json({ error: 'La hora de fin debe ser posterior a la hora de inicio' }, { status: 400 })
    }
    updateData.hora_fin = body.hora_fin
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    // Contrainte d'exclusion de la migration 033 (appointments_no_solapamiento) -- un
    // redimensionnement de hora_fin peut faire chevaucher ce RDV avec un autre existant. Ne
    // jamais laisser fuiter le message Postgres brut (nom de contrainte, etc.) au client.
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'Este horario se superpone con otra cita existente' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ appointment: data })
}
