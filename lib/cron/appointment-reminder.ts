import { createServiceRoleClient } from '@/lib/supabase/admin'
import { dispatch } from '@/lib/dispatcher'
import { isTenantAppointmentReminderDue } from '@/lib/utils/timezone'

export async function handleAppointmentReminders() {
  const supabase = createServiceRoleClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, organization_id, fecha_cita, hora_cita, organizations(fuseau, org_settings(delai_rappel_h))')
    .eq('statut', 'pagado')

  if (error || !appointments) {
    console.error('handleAppointmentReminders error:', error)
    return
  }

  for (const appt of appointments) {
    const org = (appt.organizations as { fuseau: string } | null) ?? { fuseau: 'America/Lima' }
    const settings = ((appt.organizations as { org_settings?: { delai_rappel_h: number } | null } | null)?.org_settings) ?? { delai_rappel_h: 24 }

    if (
      isTenantAppointmentReminderDue(
        appt.fecha_cita,
        appt.hora_cita,
        settings.delai_rappel_h,
        org.fuseau
      )
    ) {
      // dispatch() vérifie déjà l'idempotence par canal (email/whatsapp) avant chaque envoi —
      // un pré-check ici bloquerait la relance d'un canal en échec si un autre a déjà réussi.
      try {
        await dispatch({
          appointmentId: appt.id,
          organizationId: appt.organization_id,
          type: 'recordatorio',
        })
      } catch (e) {
        console.error('handleAppointmentReminders dispatch error:', e)
      }
    }
  }
}
