import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)

  let query = supabase
    .from('appointments')
    .select('*, patients(nom, email, telefono)')
    .order('fecha_cita', { ascending: false })

  const statut = searchParams.get('statut')
  const depuis = searchParams.get('depuis')
  const jusquau = searchParams.get('jusquau')
  const statuts = ['pendiente', 'confirmado', 'en_curso', 'pagado', 'anulado'] as const

  if (statut && statuts.includes(statut as typeof statuts[number])) {
    query = query.eq('statut', statut as typeof statuts[number])
  }
  if (depuis) query = query.gte('fecha_cita', depuis)
  if (jusquau) query = query.lte('fecha_cita', jusquau)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ appointments: data })
}
