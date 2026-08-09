import { createClient } from '@/lib/supabase/server'

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
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-sm text-gray-500">Prochains RDV</p>
          <p className="text-3xl font-bold">{appointments?.length ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-sm text-gray-500">En attente de paiement</p>
          <p className="text-3xl font-bold">{countsByStatus['pendiente'] ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-sm text-gray-500">Payés</p>
          <p className="text-3xl font-bold">{countsByStatus['pagado'] ?? 0}</p>
        </div>
      </div>
    </div>
  )
}
