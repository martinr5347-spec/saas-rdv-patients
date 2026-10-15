import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/dispatcher/channels/email'
import { subDays, subMonths, format } from 'date-fns'
import type { Database } from '@/types/database'

type PatientRow = Database['public']['Tables']['patients']['Row']
type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrgSettingsRow = Database['public']['Tables']['org_settings']['Row']

interface PatientWithOrg extends PatientRow {
  organizations:
    | (Pick<OrganizationRow, 'nom' | 'langue'> & {
        org_settings: Pick<OrgSettingsRow, 'calendly_url' | 'control_recall_anticipacion_dias'> | null
      })
    | null
}

// Moteur minimal identique à renderTemplate() (lib/dispatcher/index.ts), non exporté là-bas —
// dupliqué ici volontairement plutôt que d'élargir l'API de dispatch() pour un flux patient-level
// qui n'a pas d'appointment associé.
function renderControlRecallTemplate(corps: string, vars: Record<string, string>) {
  const conditions: Record<string, boolean> = { calendly_url: Boolean(vars.calendly_url) }
  let out = corps.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName: string, inner: string) =>
    conditions[varName] ? inner : ''
  )
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
  }
  return out
}

async function sendRecallEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  patient: Pick<PatientWithOrg, 'id' | 'nom' | 'email' | 'organization_id' | 'organizations'>
): Promise<boolean> {
  if (!patient.email) {
    console.warn(`patient-recall: paciente ${patient.id} sin email, omitido`)
    return false
  }

  const langue = patient.organizations?.langue === 'pt' ? 'pt' : 'es'

  const { data: orgTemplate } = await supabase
    .from('message_templates')
    .select('sujet, corps')
    .eq('organization_id', patient.organization_id)
    .eq('type', 'control_recall')
    .eq('canal', 'email')
    .eq('langue', langue)
    .maybeSingle()

  const template =
    orgTemplate ??
    (
      await supabase
        .from('message_templates')
        .select('sujet, corps')
        .is('organization_id', null)
        .eq('type', 'control_recall')
        .eq('canal', 'email')
        .eq('langue', langue)
        .maybeSingle()
    ).data

  if (!template) {
    console.error(`patient-recall: template control_recall/email/${langue} introuvable`)
    return false
  }

  const vars = {
    nom_patient: patient.nom,
    nombre_cabinet: patient.organizations?.nom ?? '',
    calendly_url: patient.organizations?.org_settings?.calendly_url ?? '',
  }
  const body = renderControlRecallTemplate(template.corps, vars)
  const subject = template.sujet ? renderControlRecallTemplate(template.sujet, vars) : 'Es momento de tu control'

  await sendEmail(patient.email, subject, body)
  return true
}

export async function handlePatientRecalls() {
  const supabase = createServiceRoleClient()
  const today = new Date()

  // Passage 1 : première invitation, jamais envoyée. Le moment d'envoi réel dépend du réglage
  // par organisation control_recall_anticipacion_dias (N jours avant proximo_control_fecha) --
  // comme ça varie par organisation, on récupère tous les candidats non-envoyés puis on filtre
  // en mémoire plutôt qu'un simple .lte() sur la date.
  const { data: candidatos, error: errorCandidatos } = await supabase
    .from('patients')
    .select('id, nom, email, organization_id, proximo_control_fecha, organizations(nom, langue, org_settings(calendly_url, control_recall_anticipacion_dias))')
    .eq('proximo_control_enviado', false)
    .not('proximo_control_fecha', 'is', null)

  if (errorCandidatos) {
    console.error('handlePatientRecalls (envoi initial) error:', errorCandidatos)
  } else {
    for (const patient of (candidatos ?? []) as unknown as PatientWithOrg[]) {
      const anticipacionDias = patient.organizations?.org_settings?.control_recall_anticipacion_dias ?? 14
      const fechaControl = new Date(`${patient.proximo_control_fecha}T00:00:00Z`)
      const fechaEnvio = subDays(fechaControl, anticipacionDias)
      if (fechaEnvio > today) continue // pas encore le moment d'envoyer

      try {
        const sent = await sendRecallEmail(supabase, patient)
        if (sent) {
          await supabase
            .from('patients')
            .update({ proximo_control_enviado: true, proximo_control_enviado_at: new Date().toISOString() })
            .eq('id', patient.id)
        }
      } catch (e) {
        console.error(`patient-recall: échec envoi initial patient ${patient.id}:`, e)
        // Ne pas marquer enviado=true si l'envoi a échoué -- le cron réessaiera au prochain passage.
      }
    }
  }

  // Passage 2 : escalade -- déjà invité il y a plus d'un mois, jamais relancé depuis.
  // "fecha + 1 mois <= aujourd'hui" réécrit en "fecha <= aujourd'hui - 1 mois" pour rester un filtre SQL simple.
  const seuilUnMois = format(subMonths(today, 1), 'yyyy-MM-dd')
  const { data: patientsARelancer, error: errorRelancer } = await supabase
    .from('patients')
    .select('id, nom, email, organization_id, organizations(nom, langue, org_settings(calendly_url, control_recall_anticipacion_dias))')
    .eq('proximo_control_enviado', true)
    .eq('proximo_control_relanzado', false)
    .not('proximo_control_fecha', 'is', null)
    .lte('proximo_control_fecha', seuilUnMois)

  if (errorRelancer) {
    console.error('handlePatientRecalls (escalade) error:', errorRelancer)
    return
  }

  for (const patient of (patientsARelancer ?? []) as unknown as PatientWithOrg[]) {
    try {
      const sent = await sendRecallEmail(supabase, patient)
      if (sent) {
        await supabase.from('patients').update({ proximo_control_relanzado: true }).eq('id', patient.id)
      }
    } catch (e) {
      console.error(`patient-recall: échec relance escalade patient ${patient.id}:`, e)
      // Idem -- ne pas marquer relanzado=true si l'envoi échoue.
    }
  }
}
