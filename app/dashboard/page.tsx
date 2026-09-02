import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/ui/StatCard'
import { CalendarIcon } from '@/components/layout/icons'

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Tableau de bord</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Prochains RDV" value={appointments?.length ?? 0} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label="En attente de paiement" value={countsByStatus['pendiente'] ?? 0} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label="Payés" value={countsByStatus['pagado'] ?? 0} icon={<CalendarIcon className="h-5 w-5" />} />
      </div>
    </div>
  )
}
