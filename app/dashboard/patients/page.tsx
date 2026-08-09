import { createClient } from '@/lib/supabase/server'

export default async function PatientsPage() {
  const supabase = createClient()
  const { data: patients } = await supabase
    .from('patients')
    .select('id, nom, email, telefono')
    .order('nom')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Patients</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Téléphone</th>
            </tr>
          </thead>
          <tbody>
            {(patients ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.nom}</td>
                <td className="px-4 py-2">{p.email ?? '-'}</td>
                <td className="px-4 py-2">{p.telefono ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
