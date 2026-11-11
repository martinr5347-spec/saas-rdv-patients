import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/dispatcher/channels/email'
import { sendWhatsApp } from '@/lib/dispatcher/channels/whatsapp'
import { sendWhatsAppTwilio } from '@/lib/dispatcher/channels/whatsappTwilio'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'
import { subDays, subMonths, format } from 'date-fns'
import type { Database } from '@/types/database'
import { extraerPrimerNombre } from '@/lib/utils/nombre'
import { VariantId, getControlRecallTwilioContentSid } from '@/lib/dispatcher/templateVariants'

type PatientRow = Database['public']['Tables']['patients']['Row']
type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrgSettingsRow = Database['public']['Tables']['org_settings']['Row']

interface PatientWithOrg extends PatientRow {
  organizations:
    | (Pick<OrganizationRow, 'nom' | 'langue' | 'slug'> & {
        org_settings: Pick<
          OrgSettingsRow,
          | 'calendly_url'
          | 'control_recall_anticipacion_dias'
          | 'variante_control_recall'
          | 'canal_email'
          | 'canal_whatsapp'
          | 'canal_whatsapp_provider'
          | 'twilio_subaccount_sid'
          | 'twilio_whatsapp_number'
          | 'twilio_auth_token_encrypted'
          | 'unipile_account_id'
        > | null
      })
    | null
}

// Moteur minimal identique à renderTemplate() (lib/dispatcher/index.ts), non exporté là-bas —
// dupliqué ici volontairement plutôt que d'élargir l'API de dispatch() pour un flux patient-level
// qui n'a pas d'appointment associé.
function renderControlRecallTemplate(corps: string, vars: Record<string, string>) {
  const conditions: Record<string, boolean> = { reserva_url: Boolean(vars.reserva_url) }
  let out = corps.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName: string, inner: string) =>
    conditions[varName] ? inner : ''
  )
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
  }
  return out
}

// Partie 5a : pointe vers la reservation native reservar/[slug] (portant la session Control
// d'origine en parametre, cf. Partie 5b) plutot que vers calendly_url -- fallback sur calendly_url
// uniquement si l'organisation n'a pas encore de slug de reservation configure.
function buildReservaUrl(slug: string | null, calendlyUrl: string | null, controlSesionId: string | null): string {
  if (slug) {
    const base = `${process.env.NEXT_PUBLIC_APP_URL}/reservar/${slug}`
    return controlSesionId ? `${base}?controlSesionId=${controlSesionId}` : base
  }
  return calendlyUrl ?? ''
}

async function sendRecallEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  patient: Pick<PatientWithOrg, 'id' | 'nom' | 'email' | 'organization_id' | 'organizations' | 'proximo_control_sesion_id'>
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
    nom_patient: extraerPrimerNombre(patient.nom),
    nombre_cabinet: patient.organizations?.nom ?? '',
    reserva_url: buildReservaUrl(
      patient.organizations?.slug ?? null,
      patient.organizations?.org_settings?.calendly_url ?? null,
      patient.proximo_control_sesion_id ?? null
    ),
  }
  const body = renderControlRecallTemplate(template.corps, vars)
  const subject = template.sujet ? renderControlRecallTemplate(template.sujet, vars) : 'Es momento de tu control'

  await sendEmail(patient.email, subject, body)
  return true
}

// Parallele a sendRecallEmail() -- meme pattern org-override-puis-defaut pour le template
// (canal='whatsapp' au lieu de 'email'), meme calcul de buildReservaUrl(). canal_whatsapp est
// verifie par l'appelant (sendRecallNotifications), pas ici -- cette fonction ne fait qu'essayer
// d'envoyer sur ce canal pour ce patient.
async function sendRecallWhatsApp(
  supabase: ReturnType<typeof createServiceRoleClient>,
  patient: Pick<PatientWithOrg, 'id' | 'nom' | 'telefono' | 'organization_id' | 'organizations' | 'proximo_control_sesion_id'>
): Promise<boolean> {
  if (!patient.telefono) {
    console.warn(`patient-recall: paciente ${patient.id} sin teléfono, omitido (whatsapp)`)
    return false
  }

  const settings = patient.organizations?.org_settings
  if (!settings) {
    console.error(`patient-recall: org_settings manquant pour la organización ${patient.organization_id}`)
    return false
  }
  const langue = patient.organizations?.langue === 'pt' ? 'pt' : 'es'

  const { data: orgTemplate } = await supabase
    .from('message_templates')
    .select('sujet, corps')
    .eq('organization_id', patient.organization_id)
    .eq('type', 'control_recall')
    .eq('canal', 'whatsapp')
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
        .eq('canal', 'whatsapp')
        .eq('langue', langue)
        .maybeSingle()
    ).data

  if (!template) {
    console.error(`patient-recall: template control_recall/whatsapp/${langue} introuvable`)
    return false
  }

  const vars = {
    nom_patient: extraerPrimerNombre(patient.nom),
    nombre_cabinet: patient.organizations?.nom ?? '',
    reserva_url: buildReservaUrl(
      patient.organizations?.slug ?? null,
      patient.organizations?.org_settings?.calendly_url ?? null,
      patient.proximo_control_sesion_id ?? null
    ),
  }

  // Meme bascule explicite par organisation que dispatch() (lib/dispatcher/index.ts) -- 'unipile'
  // reste le defaut tant que canal_whatsapp_provider n'est pas 'twilio'.
  const whatsappProvider: 'unipile' | 'twilio' = settings.canal_whatsapp_provider === 'twilio' ? 'twilio' : 'unipile'

  if (whatsappProvider === 'twilio') {
    const { twilio_subaccount_sid: subaccountSid, twilio_whatsapp_number: fromNumber, twilio_auth_token_encrypted: authTokenEncrypted } = settings
    if (!subaccountSid || !fromNumber || !authTokenEncrypted) {
      console.error(`patient-recall: configuración de Twilio incompleta para la organización ${patient.organization_id}`)
      return false
    }

    let authToken: string
    try {
      authToken = decryptSecret(authTokenEncrypted)
    } catch (decryptError) {
      console.error('patient-recall: erreur dechiffrement twilio_auth_token_encrypted', decryptError)
      return false
    }

    const variant: VariantId = settings.variante_control_recall === 'calido' ? 'calido' : 'standard'
    const contentSid = getControlRecallTwilioContentSid(variant, langue)
    if (!contentSid) {
      console.warn(`patient-recall: template Twilio no configurado para control_recall (${variant}/${langue})`)
      return false
    }

    await sendWhatsAppTwilio(subaccountSid, authToken, fromNumber, patient.telefono, contentSid, vars)
  } else {
    const accountId = settings.unipile_account_id
    if (!accountId) {
      console.error(`patient-recall: cuenta Unipile faltante para la organización ${patient.organization_id}`)
      return false
    }
    const body = renderControlRecallTemplate(template.corps, vars)
    await sendWhatsApp(accountId, patient.telefono, body)
  }

  return true
}

// Oriente l'envoi vers email et/ou whatsapp selon canal_email/canal_whatsapp (comme dispatch()
// pour les notifications de rendez-vous) -- les deux peuvent tourner en parallele, pas de logique
// "whatsapp prioritaire, email en secours". Un canal qui echoue n'empeche pas l'autre d'etre
// tente ; au moins un canal reussi suffit pour considerer le rappel comme envoye.
async function sendRecallNotifications(supabase: ReturnType<typeof createServiceRoleClient>, patient: PatientWithOrg): Promise<boolean> {
  const settings = patient.organizations?.org_settings
  const canalEmail = settings?.canal_email ?? false
  const canalWhatsapp = settings?.canal_whatsapp ?? false

  if (!canalEmail && !canalWhatsapp) {
    console.warn(`patient-recall: ningún canal activo para la organización ${patient.organization_id}, paciente ${patient.id} omitido`)
    return false
  }

  let emailOk = false
  let whatsappOk = false

  if (canalEmail) {
    try {
      emailOk = await sendRecallEmail(supabase, patient)
    } catch (e) {
      console.error(`patient-recall: échec envoi email patient ${patient.id}:`, e)
    }
  }

  if (canalWhatsapp) {
    try {
      whatsappOk = await sendRecallWhatsApp(supabase, patient)
    } catch (e) {
      console.error(`patient-recall: échec envoi whatsapp patient ${patient.id}:`, e)
    }
  }

  return emailOk || whatsappOk
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
    .select(
      'id, nom, email, telefono, organization_id, proximo_control_fecha, proximo_control_sesion_id, organizations(nom, langue, slug, org_settings(calendly_url, control_recall_anticipacion_dias, variante_control_recall, canal_email, canal_whatsapp, canal_whatsapp_provider, twilio_subaccount_sid, twilio_whatsapp_number, twilio_auth_token_encrypted, unipile_account_id))'
    )
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
        const sent = await sendRecallNotifications(supabase, patient)
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
    .select(
      'id, nom, email, telefono, organization_id, proximo_control_sesion_id, organizations(nom, langue, slug, org_settings(calendly_url, control_recall_anticipacion_dias, variante_control_recall, canal_email, canal_whatsapp, canal_whatsapp_provider, twilio_subaccount_sid, twilio_whatsapp_number, twilio_auth_token_encrypted, unipile_account_id))'
    )
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
      const sent = await sendRecallNotifications(supabase, patient)
      if (sent) {
        await supabase.from('patients').update({ proximo_control_relanzado: true }).eq('id', patient.id)
      }
    } catch (e) {
      console.error(`patient-recall: échec relance escalade patient ${patient.id}:`, e)
      // Idem -- ne pas marquer relanzado=true si l'envoi échoue.
    }
  }
}
