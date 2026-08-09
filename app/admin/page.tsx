import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: organizations } = await supabase.from('organizations').select('id, nom, pays, created_at')
  const { data: subscriptions } = await supabase.from('subscriptions').select('organization_id, plan, statut')

  const orgsWithStatus = (organizations ?? []).map((org) => ({
    ...org,
    subscription: subscriptions?.find((s) => s.organization_id === org.id),
  }))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Admin plateforme</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Cabinet</th>
              <th className="px-4 py-2 text-left">Pays</th>
              <th className="px-4 py-2 text-left">Plan</th>
              <th className="px-4 py-2 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orgsWithStatus.map((org) => (
              <tr key={org.id} className="border-t">
                <td className="px-4 py-2">{org.nom}</td>
                <td className="px-4 py-2">{org.pays}</td>
                <td className="px-4 py-2">{org.subscription?.plan ?? '-'}</td>
                <td className="px-4 py-2">{org.subscription?.statut ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
