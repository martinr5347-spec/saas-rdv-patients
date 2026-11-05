import { createServiceRoleClient } from '@/lib/supabase/admin'
import { dispatch } from '@/lib/dispatcher'
import { addDays, startOfDay } from 'date-fns'
import type { Database } from '@/types/database'

type AppointmentRow = Database['public']['Tables']['appointments']['Row']
type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrgSettingsRow = Database['public']['Tables']['org_settings']['Row']

interface AppointmentWithOrg extends Pick<AppointmentRow, 'id' | 'organization_id' | 'fecha_cita'> {
  organizations:
    | (Pick<OrganizationRow, 'id'> & {
        org_settings: Pick<OrgSettingsRow, 'solicitud_resena_activa' | 'solicitud_resena_delay_dias' | 'google_review_link'> | null
      })
    | null
}

export async function handleReviewRequests() {
  const supabase = createServiceRoleClient()
  const today = startOfDay(new Date())

  // solicitud_resena_delay_dias varie par organisation (meme raison que patient-recall.ts) --
  // recuperation large des RDV payes/confirmes, puis filtre "le delai est-il ecoule ?" en memoire
  // plutot qu'un .lte() SQL unique, impossible a exprimer de facon heterogene par organisation.
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      'id, organization_id, fecha_cita, organizations(id, org_settings(solicitud_resena_activa, solicitud_resena_delay_dias, google_review_link))'
    )
    .in('statut', ['pagado', 'confirmado'])
    .not('fecha_cita', 'is', null)

  if (error || !appointments) {
    console.error('handleReviewRequests error:', error)
    return
  }

  for (const appt of (appointments ?? []) as unknown as AppointmentWithOrg[]) {
    const settings = appt.organizations?.org_settings
    if (!settings?.solicitud_resena_activa) continue

    // Double garde explicite (cf. "Ce qu'il NE FAUT PAS faire" du prompt) : meme si l'activation
    // etait restee vraie par erreur, aucun envoi sans lien reellement configure.
    const lien = settings.google_review_link?.trim()
    if (!lien) continue

    const delayDias = settings.solicitud_resena_delay_dias ?? 3
    const fechaEnvio = addDays(startOfDay(new Date(`${appt.fecha_cita}T00:00:00Z`)), delayDias)
    if (fechaEnvio > today) continue // delai pas encore ecoule pour cette organisation

    // dispatch() applique deja la garde anti-doublon unique(appointment_id, canal, type) avant
    // chaque envoi -- aucun pre-check "deja envoye" a dupliquer ici, meme si le cron retourne
    // plusieurs fois sur le meme RDV.
    try {
      await dispatch({
        appointmentId: appt.id,
        organizationId: appt.organization_id,
        type: 'solicitud_resena',
      })
    } catch (e) {
      console.error(`handleReviewRequests dispatch error (appointment ${appt.id}):`, e)
    }
  }
}
