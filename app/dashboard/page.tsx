import { createClient } from '@/lib/supabase/server'
import DashboardHomeView from './DashboardHomeView'

export default async function DashboardHomePage() {
  const supabase = createClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut')
    .order('fecha_cita', { ascending: false })
    .limit(5)

  const countsByStatus = (appointments ?? []).reduce(
    (acc, a) => {
      acc[a.statut] = (acc[a.statut] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <DashboardHomeView
      total={appointments?.length ?? 0}
      pending={countsByStatus['pendiente'] ?? 0}
      paid={countsByStatus['pagado'] ?? 0}
    />
  )
}
