import { createClient } from '@/lib/supabase/server'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: organizations } = await supabase.from('organizations').select('id, nom, pays, created_at')
  const { data: subscriptions } = await supabase.from('subscriptions').select('organization_id, plan, statut')

  const orgsWithStatus = (organizations ?? []).map((org) => ({
    ...org,
    subscription: subscriptions?.find((s) => s.organization_id === org.id),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Admin plateforme</h1>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Cabinet</TableCell>
              <TableCell isHeader>Pays</TableCell>
              <TableCell isHeader>Plan</TableCell>
              <TableCell isHeader>Statut</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgsWithStatus.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium text-gray-800">{org.nom}</TableCell>
                <TableCell>{org.pays}</TableCell>
                <TableCell>{org.subscription?.plan ?? '-'}</TableCell>
                <TableCell>
                  {org.subscription?.statut ? (
                    <Badge color={org.subscription.statut === 'active' ? 'success' : org.subscription.statut === 'past_due' ? 'warning' : 'gray'}>
                      {org.subscription.statut}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
