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

  const updateData: Pick<AppointmentUpdate, 'statut' | 'presente'> = {}

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ appointment: data })
}
