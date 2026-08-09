import { createServiceRoleClient } from '@/lib/supabase/admin'
import { dispatch } from '@/lib/dispatcher'
import { isTenantDeadlinePassed } from '@/lib/utils/timezone'

export async function handlePaymentDeadlines() {
  const supabase = createServiceRoleClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, organization_id, fecha_reserva, organizations(fuseau, org_settings(delai_paiement_h))')
    .eq('statut', 'pendiente')

  if (error || !appointments) {
    console.error('handlePaymentDeadlines error:', error)
    return
  }

  for (const appt of appointments) {
    const org = (appt.organizations as { fuseau: string } | null) ?? { fuseau: 'America/Lima' }
    const settings = ((appt.organizations as { org_settings?: { delai_paiement_h: number } | null } | null)?.org_settings) ?? { delai_paiement_h: 12 }

    if (isTenantDeadlinePassed(appt.fecha_reserva, settings.delai_paiement_h, org.fuseau)) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ statut: 'anulado' })
        .eq('id', appt.id)

      if (updateError) {
        console.error('handlePaymentDeadlines update error:', updateError)
        continue
      }

      try {
        await dispatch({
          appointmentId: appt.id,
          organizationId: appt.organization_id,
          type: 'anulacion',
        })
      } catch (e) {
        console.error('handlePaymentDeadlines dispatch error:', e)
      }
    }
  }
}
