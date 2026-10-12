import { createClient } from '@/lib/supabase/server'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default async function AdminPage() {
  const supabase = createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, nom, pays, created_at')
    .order('created_at', { ascending: false })

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('organization_id, plan, statut')

  const { data: patients } = await supabase.from('patients').select('id, organization_id')
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, organization_id, fecha_reserva')

  // Échecs d'envoi récents, tous cabinets confondus (30 derniers jours)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: failedNotifs } = await supabase
    .from('notifications')
    .select('id, canal, type, error_message, created_at, appointments(organization_id, patients(nom))')
    .eq('statut', 'failed')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)

  const orgsWithStats = (organizations ?? []).map((org) => {
    const orgPatients = (patients ?? []).filter((p) => p.organization_id === org.id)
    const orgAppointments = (appointments ?? []).filter((a) => a.organization_id === org.id)
    const lastAppointment = orgAppointments.length
      ? orgAppointments.reduce((latest, a) =>
          new Date(a.fecha_reserva) > new Date(latest.fecha_reserva) ? a : latest
        )
      : null

    return {
      ...org,
      subscription: subscriptions?.find((s) => s.organization_id === org.id),
      patientsCount: orgPatients.length,
      appointmentsCount: orgAppointments.length,
      lastActivity: lastAppointment?.fecha_reserva ?? null,
    }
  })

  const orgNameById = new Map((organizations ?? []).map((o) => [o.id, o.nom]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Admin plataforma</h1>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Cabinet</TableCell>
              <TableCell isHeader>País</TableCell>
              <TableCell isHeader>Plan</TableCell>
              <TableCell isHeader>Statut</TableCell>
              <TableCell isHeader>Inscrit</TableCell>
              <TableCell isHeader>Pacientes</TableCell>
              <TableCell isHeader>Citas</TableCell>
              <TableCell isHeader>Última actividad</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgsWithStats.map((org) => (
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
                <TableCell>
                  <span title={new Date(org.created_at).toLocaleString()}>
                    hace {daysSince(org.created_at)} día{daysSince(org.created_at) !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell>{org.patientsCount}</TableCell>
                <TableCell>{org.appointmentsCount}</TableCell>
                <TableCell>
                  {org.lastActivity ? (
                    <span className={daysSince(org.lastActivity) > 14 ? 'text-amber-600' : 'text-gray-600'}>
                      hace {daysSince(org.lastActivity)} día{daysSince(org.lastActivity) !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">Sin actividad</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Envíos fallidos (últimos 30 días)</h2>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Cabinet</TableCell>
                <TableCell isHeader>Paciente</TableCell>
                <TableCell isHeader>Canal</TableCell>
                <TableCell isHeader>Tipo</TableCell>
                <TableCell isHeader>Error</TableCell>
                <TableCell isHeader>Fecha</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!failedNotifs || failedNotifs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-gray-500">Sin envíos fallidos recientes.</TableCell>
                </TableRow>
              )}
              {(failedNotifs ?? []).map((n) => {
                const appt = n.appointments as unknown as { organization_id: string; patients: { nom: string } | null } | null
                return (
                  <TableRow key={n.id}>
                    <TableCell>{appt ? orgNameById.get(appt.organization_id) ?? '-' : '-'}</TableCell>
                    <TableCell>{appt?.patients?.nom ?? '-'}</TableCell>
                    <TableCell>{n.canal}</TableCell>
                    <TableCell>{n.type}</TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate text-error-600" title={n.error_message ?? ''}>
                        {n.error_message ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  )
}
