import { createClient } from '@/lib/supabase/server'
import AppointmentDetailView, { AppointmentNotFound } from './AppointmentDetailView'

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
    return <AppointmentNotFound />
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
    <AppointmentDetailView
      appointment={{
        id: appointment.id,
        fecha_cita: appointment.fecha_cita,
        hora_cita: appointment.hora_cita,
        statut: appointment.statut,
        monto_acompte: appointment.monto_acompte,
        notas: appointment.notas,
        link_pago: appointment.link_pago,
        presente: appointment.presente ?? null,
      }}
      patient={patient}
      notifications={notifications}
    />
  )
}
