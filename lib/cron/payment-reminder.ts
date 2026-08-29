import { createServiceRoleClient } from '@/lib/supabase/admin'
import { dispatch } from '@/lib/dispatcher'
import { isTenantDeadlinePassed } from '@/lib/utils/timezone'

export async function handlePaymentReminders() {
  const supabase = createServiceRoleClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, organization_id, fecha_reserva, organizations(fuseau, org_settings(delai_paiement_h, delai_aviso_h))')
    .eq('statut', 'pendiente')

  if (error || !appointments) {
    console.error('handlePaymentReminders error:', error)
    return
  }

  for (const appt of appointments) {
    const org = (appt.organizations as { fuseau: string } | null) ?? { fuseau: 'America/Lima' }
    const settings = ((appt.organizations as { org_settings?: { delai_paiement_h: number; delai_aviso_h: number } | null } | null)?.org_settings) ?? {
      delai_paiement_h: 12,
      delai_aviso_h: 6,
    }

    const avisoPassed = isTenantDeadlinePassed(appt.fecha_reserva, settings.delai_aviso_h, org.fuseau)
    const paymentPassed = isTenantDeadlinePassed(appt.fecha_reserva, settings.delai_paiement_h, org.fuseau)

    if (!avisoPassed || paymentPassed) continue

    // dispatch() vérifie déjà l'idempotence par canal (email/whatsapp) avant chaque envoi —
    // un pré-check ici bloquerait la relance d'un canal en échec si un autre a déjà réussi.
    try {
      await dispatch({
        appointmentId: appt.id,
        organizationId: appt.organization_id,
        type: 'aviso',
      })
    } catch (e) {
      console.error('handlePaymentReminders dispatch error:', e)
    }
  }
}
