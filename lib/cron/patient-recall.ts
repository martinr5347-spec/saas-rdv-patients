import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/dispatcher/channels/email'
import type { Database } from '@/types/database'

type PatientRow = Database['public']['Tables']['patients']['Row']
type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrgSettingsRow = Database['public']['Tables']['org_settings']['Row']

interface PatientWithOrg extends PatientRow {
  organizations: (Pick<OrganizationRow, 'nom' | 'langue'> & { org_settings: Pick<OrgSettingsRow, 'calendly_url'> | null }) | null
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

export async function handlePatientRecalls() {
  const supabase = createServiceRoleClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, nom, email, organization_id, proximo_control_fecha, organizations(nom, langue, org_settings(calendly_url))')
    .eq('proximo_control_enviado', false)
    .not('proximo_control_fecha', 'is', null)
    .lte('proximo_control_fecha', today)

  if (error || !patients) {
    console.error('handlePatientRecalls error:', error)
    return
  }

  for (const patient of patients as unknown as PatientWithOrg[]) {
    try {
      if (!patient.email) {
        console.warn(`handlePatientRecalls: paciente ${patient.id} sin email, omitido`)
        continue
      }

      const langue = patient.organizations?.langue === 'pt' ? 'pt' : 'es'

      const { data: template } = await supabase
        .from('message_templates')
        .select('sujet, corps')
        .is('organization_id', null)
        .eq('type', 'control_recall')
        .eq('canal', 'email')
        .eq('langue', langue)
        .maybeSingle()

      if (!template) {
        console.error(`handlePatientRecalls: template control_recall/email/${langue} introuvable`)
        continue
      }

      const vars = {
        nom_patient: patient.nom,
        nombre_cabinet: patient.organizations?.nom ?? '',
        calendly_url: patient.organizations?.org_settings?.calendly_url ?? '',
      }
      const body = renderControlRecallTemplate(template.corps, vars)
      const subject = template.sujet ? renderControlRecallTemplate(template.sujet, vars) : 'Es momento de tu control'

      await sendEmail(patient.email, subject, body)

      // Marqué enviado = true SEULEMENT si sendEmail n'a pas levé d'erreur.
      await supabase
        .from('patients')
        .update({ proximo_control_enviado: true, proximo_control_enviado_at: new Date().toISOString() })
        .eq('id', patient.id)
    } catch (e) {
      console.error(`handlePatientRecalls: erreur envoi patient ${patient.id}:`, e)
    }
  }
}
