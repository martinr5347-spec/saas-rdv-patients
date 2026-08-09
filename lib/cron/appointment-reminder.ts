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
      const { data: alreadySent } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('type', 'recordatorio')
        .eq('statut', 'sent')
        .maybeSingle()

      if (alreadySent) continue

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
