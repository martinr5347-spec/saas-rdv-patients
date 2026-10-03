import { createClient } from '@/lib/supabase/server'
import AppointmentsView from './AppointmentsView'

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { statut?: string; depuis?: string; jusquau?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut, monto_acompte, patients(nom)')
    .order('fecha_cita', { ascending: false })

  const statuts = ['pendiente', 'pagado', 'anulado'] as const
  if (searchParams.statut && statuts.includes(searchParams.statut as typeof statuts[number])) {
    query = query.eq('statut', searchParams.statut as typeof statuts[number])
  }
  if (searchParams.depuis) query = query.gte('fecha_cita', searchParams.depuis)
  if (searchParams.jusquau) query = query.lte('fecha_cita', searchParams.jusquau)

  const { data: appointments, error } = await query

  // Vue calendrier : independante du filtre statut ci-dessus, montre toujours
  // uniquement les RDV payes (agenda confirme du praticien). Isolation par
  // organisation deja garantie par la RLS, comme pour la requete appointments
  // ci-dessus.
  const { data: paidAppointments } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, hora_fin, patients(nom)')
    .eq('statut', 'pagado')
    .order('fecha_cita', { ascending: true })
    .limit(500)

  return (
    <AppointmentsView
      appointments={(appointments ?? []).map((a) => ({
        ...a,
        patients: a.patients as { nom: string } | null,
      }))}
      paidAppointments={(paidAppointments ?? []).map((a) => ({
        ...a,
        patients: a.patients as { nom: string } | null,
      }))}
      error={error?.message ?? null}
      statut={searchParams.statut ?? ''}
      depuis={searchParams.depuis ?? ''}
      jusquau={searchParams.jusquau ?? ''}
    />
  )
}
