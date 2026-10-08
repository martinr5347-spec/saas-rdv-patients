import { createClient } from '@/lib/supabase/server'
import PatientDetailView, { PatientNotFound } from './PatientDetailView'

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('id, nom, email, telefono, created_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!patient) return <PatientNotFound />

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut, presente, monto_acompte')
    .eq('patient_id', params.id)
    .order('fecha_cita', { ascending: false })

  const appts = appointments ?? []

  const marked = appts.filter((a) => a.presente !== null)
  const present = appts.filter((a) => a.presente === true)
  const presenceRate = marked.length > 0 ? Math.round((present.length / marked.length) * 100) : null

  return (
    <PatientDetailView
      patient={patient}
      appointments={appts}
      presenceRate={presenceRate}
      totalAppointments={appts.length}
      markedAppointments={marked.length}
    />
  )
}
