import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rendez-vous</h1>

      <form method="get" className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow">
        <select name="statut" defaultValue={searchParams.statut ?? ''} className="rounded-md border px-3 py-2">
          <option value="">Tous les statuts</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
        <input name="depuis" type="date" defaultValue={searchParams.depuis ?? ''} className="rounded-md border px-3 py-2" />
        <input name="jusquau" type="date" defaultValue={searchParams.jusquau ?? ''} className="rounded-md border px-3 py-2" />
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Filtrer</button>
      </form>

      {error && <p className="text-red-600">{error.message}</p>}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Patient</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Heure</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Acompte</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {(appointments ?? []).length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={6}>
                  Aucun rendez-vous.
                </td>
              </tr>
            )}
            {(appointments ?? []).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{(a.patients as { nom: string } | null)?.nom ?? '-'}</td>
                <td className="px-4 py-2">{a.fecha_cita}</td>
                <td className="px-4 py-2">{a.hora_cita}</td>
                <td className="px-4 py-2 capitalize">{a.statut}</td>
                <td className="px-4 py-2">{a.monto_acompte}</td>
                <td className="px-4 py-2">
                  <Link href={`/dashboard/appointments/${a.id}`} className="text-blue-600 hover:underline">
                    Détails
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
