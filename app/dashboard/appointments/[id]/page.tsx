import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table'

const STATUS_BADGE = {
  pendiente: 'warning',
  pagado: 'success',
  anulado: 'error',
} as const

export default async function AppointmentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('*, patients(*), payments(*), notifications(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !appointment) {
    return <div className="text-error-600">Rendez-vous introuvable.</div>
  }

  const patient = appointment.patients as { nom: string; email: string | null; telefono: string | null } | null
  const notifications = (appointment.notifications ?? []) as Array<{
    id: string
    canal: string
    type: string
    statut: string
    error_message: string | null
    sent_at: string | null
  }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Détail du rendez-vous</h1>
        <Link href="/dashboard/appointments" className="text-sm text-brand-600 hover:underline">
          Retour à la liste
        </Link>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Patient</span><p className="font-medium text-gray-800">{patient?.nom}</p></div>
          <div><span className="text-gray-500">Email</span><p className="text-gray-800">{patient?.email ?? '-'}</p></div>
          <div><span className="text-gray-500">Téléphone</span><p className="text-gray-800">{patient?.telefono ?? '-'}</p></div>
          <div><span className="text-gray-500">Date / Heure</span><p className="text-gray-800">{appointment.fecha_cita} à {appointment.hora_cita}</p></div>
          <div><span className="text-gray-500">Statut</span><p><Badge color={STATUS_BADGE[appointment.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{appointment.statut}</Badge></p></div>
          <div><span className="text-gray-500">Acompte</span><p className="text-gray-800">{appointment.monto_acompte}</p></div>
        </div>

        {appointment.notas && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Notes</span>
            <p className="mt-1 text-gray-800">{appointment.notas}</p>
          </div>
        )}

        {appointment.link_pago && appointment.statut === 'pendiente' && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Lien de paiement</span>
            <a href={appointment.link_pago} target="_blank" rel="noopener noreferrer" className="block text-brand-600 hover:underline break-all">
              {appointment.link_pago}
            </a>
          </div>
        )}
      </Card>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Canal</TableCell>
              <TableCell isHeader>Type</TableCell>
              <TableCell isHeader>Statut</TableCell>
              <TableCell isHeader>Envoyé le</TableCell>
              <TableCell isHeader>Erreur</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-gray-500">Aucune notification.</TableCell>
              </TableRow>
            )}
            {notifications.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.canal}</TableCell>
                <TableCell>{n.type}</TableCell>
                <TableCell>
                  <Badge color={n.statut === 'sent' ? 'success' : n.statut === 'failed' ? 'error' : 'gray'}>{n.statut}</Badge>
                </TableCell>
                <TableCell>{n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}</TableCell>
                <TableCell className="text-error-600">{n.error_message ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
