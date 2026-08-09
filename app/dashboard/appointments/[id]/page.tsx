import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    return <div className="text-red-600">Rendez-vous introuvable.</div>
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
        <h1 className="text-2xl font-semibold">Détail du rendez-vous</h1>
        <Link href="/dashboard/appointments" className="text-sm text-blue-600 hover:underline">
          Retour à la liste
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Patient</span><p className="font-medium">{patient?.nom}</p></div>
          <div><span className="text-gray-500">Email</span><p>{patient?.email ?? '-'}</p></div>
          <div><span className="text-gray-500">Téléphone</span><p>{patient?.telefono ?? '-'}</p></div>
          <div><span className="text-gray-500">Date / Heure</span><p>{appointment.fecha_cita} à {appointment.hora_cita}</p></div>
          <div><span className="text-gray-500">Statut</span><p className="capitalize">{appointment.statut}</p></div>
          <div><span className="text-gray-500">Acompte</span><p>{appointment.monto_acompte}</p></div>
        </div>

        {appointment.notas && (
          <div>
            <span className="text-gray-500 text-sm">Notes</span>
            <p className="mt-1">{appointment.notas}</p>
          </div>
        )}

        {appointment.link_pago && appointment.statut === 'pendiente' && (
          <div>
            <span className="text-gray-500 text-sm">Lien de paiement</span>
            <a href={appointment.link_pago} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline break-all">
              {appointment.link_pago}
            </a>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Canal</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Envoyé le</th>
              <th className="px-4 py-2 text-left">Erreur</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 && (
              <tr><td className="px-4 py-4 text-gray-500" colSpan={5}>Aucune notification.</td></tr>
            )}
            {notifications.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="px-4 py-2">{n.canal}</td>
                <td className="px-4 py-2">{n.type}</td>
                <td className="px-4 py-2">{n.statut}</td>
                <td className="px-4 py-2">{n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}</td>
                <td className="px-4 py-2 text-red-600">{n.error_message ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
