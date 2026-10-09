import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type PatientUpdate = Database['public']['Tables']['patients']['Update']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))

  const updateData: Pick<PatientUpdate, 'fecha_nacimiento'> = {}

  if (body.fecha_nacimiento !== undefined) {
    if (body.fecha_nacimiento !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_nacimiento)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }
    updateData.fecha_nacimiento = body.fecha_nacimiento
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('patients')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ patient: data })
}
