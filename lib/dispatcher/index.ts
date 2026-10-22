import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from './channels/email'
import { sendWhatsApp } from './channels/whatsapp'
import { sendWhatsAppTwilio } from './channels/whatsappTwilio'
import { NotificationJob } from './types'
import { Database } from '@/types/database'
import { getDailyLimit, startOfTodayIso, MIN_SECONDS_BETWEEN_MESSAGES } from './warming'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/timezone'
import { decryptSecret } from '@/lib/crypto/settingsEncryption'
import { NotificationType, VariantId, getTwilioContentSid } from './templateVariants'

type Appointment = Database['public']['Tables']['appointments']['Row']
type OrgSettings = Database['public']['Tables']['org_settings']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']
type Patient = Database['public']['Tables']['patients']['Row']
type Template = Database['public']['Tables']['message_templates']['Row']

interface AppointmentWithRelations extends Appointment {
  patients: Patient | null
  organizations: (Organization & { org_settings: OrgSettings | null }) | null
}

// Extrait du corps de renderTemplate() -- reutilise telle quelle par le routage Twilio (les
// variables d'un template Meta approuve referencent les memes donnees que celles interpolees
// dans le texte libre Unipile/email), sans dupliquer le calcul.
function buildTemplateValues(appt: AppointmentWithRelations): Record<string, string> {
  const patient = appt.patients
  const org = appt.organizations
  const settings = org?.org_settings

  const montoAcompte = typeof appt.monto_acompte === 'number' ? appt.monto_acompte : Number(appt.monto_acompte)
  const langue = org?.langue ?? 'es'
  const fechaCita = appt.fecha_cita ? formatDisplayDate(appt.fecha_cita, langue) : ''
  const horaCita = appt.hora_cita ? formatDisplayTime(appt.hora_cita) : ''

  const costoTotal = settings?.costo_total
  const hasCostoDesglose = typeof costoTotal === 'number' && costoTotal > montoAcompte
  const restoPagar = hasCostoDesglose ? costoTotal - montoAcompte : null

  return {
    nom_patient: patient?.nom ?? '',
    fecha_cita: fechaCita,
    hora_cita: horaCita,
    link_pago: appt.link_pago ?? '',
    monto_acompte: montoAcompte.toFixed(2),
    monnaie: settings?.monnaie ?? 'PEN',
    nombre_cabinet: org?.nom ?? '',
    direccion: org?.adresse ?? '',
    calendly_url: settings?.calendly_url ?? '',
    costo_total: typeof costoTotal === 'number' ? costoTotal.toFixed(2) : '',
    resto_pagar: restoPagar !== null ? restoPagar.toFixed(2) : '',
    gestion_link: `${process.env.NEXT_PUBLIC_APP_URL}/gestionar/${appt.gestion_token}`,
  }
}

function renderTemplate(corps: string, appt: AppointmentWithRelations, extraConditions: Record<string, boolean> = {}) {
  const org = appt.organizations
  const settings = org?.org_settings
  const montoAcompte = typeof appt.monto_acompte === 'number' ? appt.monto_acompte : Number(appt.monto_acompte)
  const costoTotal = settings?.costo_total
  const hasCostoDesglose = typeof costoTotal === 'number' && costoTotal > montoAcompte

  // Conditions consommées par {{#if ...}} — jamais interpolées telles quelles.
  const conditions: Record<string, boolean> = {
    direccion: Boolean(org?.adresse),
    costo_desglose: hasCostoDesglose,
    calendly_url: Boolean(settings?.calendly_url),
    link_pago: Boolean(appt.link_pago),
    ...extraConditions,
  }

  const values = buildTemplateValues(appt)

  // Supporte un {{else}} optionnel -- necessaire pour cambio_praticien ("annule" vs "reprogramme"
  // dans le meme sujet/corps). Les templates existants sans {{else}} continuent de fonctionner
  // a l'identique (le groupe non capturant est simplement absent).
  let out = corps.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_match, varName: string, ifPart: string, elsePart: string | undefined) =>
      conditions[varName] ? ifPart : elsePart ?? ''
  )

  for (const [key, val] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
  }

  return out
}

async function loadTemplate(
  organizationId: string,
  type: NotificationJob['type'],
  canal: 'email' | 'whatsapp',
  langue: string
): Promise<Template | null> {
  const supabase = createServiceRoleClient()

  const { data: orgTemplate } = await supabase
    .from('message_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('type', type)
    .eq('canal', canal)
    .eq('langue', langue)
    .maybeSingle()

  if (orgTemplate) return orgTemplate

  const { data: defaultTemplate } = await supabase
    .from('message_templates')
    .select('*')
    .is('organization_id', null)
    .eq('type', type)
    .eq('canal', canal)
    .eq('langue', langue)
    .maybeSingle()

  return defaultTemplate
}

export async function alertAdminEmail(subject: string, html: string) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM
    if (!adminEmail) return
    await sendEmail(adminEmail, subject, html)
  } catch (e) {
    console.error('alertAdminEmail failed:', e)
  }
}

async function alertAdmin(job: NotificationJob, canal: string, errorMessage: string) {
  await alertAdminEmail(
    `Erreur dispatcher ${job.type}`,
    `<p>Canal : ${canal}</p><p>Appointment : ${job.appointmentId}</p><p>Erreur : ${errorMessage}</p>`
  )
}

async function checkWhatsappWarming(
  supabase: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  connectedAt: string | null
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const limit = getDailyLimit(connectedAt)

  const { count } = await supabase
    .from('notifications')
    .select('id, appointments!inner(organization_id)', { count: 'exact', head: true })
    .eq('canal', 'whatsapp')
    .eq('statut', 'sent')
    .eq('appointments.organization_id', organizationId)
    .gte('sent_at', startOfTodayIso())

  const sentToday = count ?? 0
  if (sentToday >= limit) {
    return { allowed: false, reason: `Chauffe WhatsApp : quota journalier atteint (${sentToday}/${limit})` }
  }

  const { data: lastSent } = await supabase
    .from('notifications')
    .select('sent_at, appointments!inner(organization_id)')
    .eq('canal', 'whatsapp')
    .eq('statut', 'sent')
    .eq('appointments.organization_id', organizationId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastSent?.sent_at) {
    const secondsSinceLast = (Date.now() - new Date(lastSent.sent_at).getTime()) / 1000
    if (secondsSinceLast < MIN_SECONDS_BETWEEN_MESSAGES) {
      const wait = Math.ceil(MIN_SECONDS_BETWEEN_MESSAGES - secondsSinceLast)
      return { allowed: false, reason: `Chauffe WhatsApp : délai minimum entre messages non respecté (${wait}s restants)` }
    }
  }

  return { allowed: true }
}

async function sendPraticienAlert(appt: AppointmentWithRelations, job: NotificationJob) {
  const supabase = createServiceRoleClient()

  const { data: praticiens } = await supabase
    .from('users')
    .select('email')
    .eq('organization_id', job.organizationId)
    .or('role.eq.praticien,role.eq.admin')

  const template = await loadTemplate(job.organizationId, 'pago_praticien', 'email', appt.organizations?.langue ?? 'es')
  if (!template) {
    throw new Error('Template pago_praticien introuvable')
  }

  const body = renderTemplate(template.corps, appt)
  const subject = template.sujet ? renderTemplate(template.sujet, appt) : 'Alerte praticien'

  const emails = (praticiens ?? []).map((u) => u.email).filter(Boolean)
  if (emails.length === 0) {
    throw new Error('Aucun email praticien trouvé')
  }

  await sendEmail(emails[0], subject, body)

  await supabase.from('notifications').insert({
    appointment_id: job.appointmentId,
    canal: 'email',
    type: 'pago_praticien',
    statut: 'sent',
    sent_at: new Date().toISOString(),
  })
}

// Alerte praticien pour une annulation ou reprogrammation faite par le patient lui-meme
// (page /gestionar/[token]) -- meme pattern que sendPraticienAlert (template unique, pas de
// variante, emails des praticien/admin de l'organisation).
async function sendCambioPraticienAlert(appt: AppointmentWithRelations, job: NotificationJob, cancelado: boolean) {
  const supabase = createServiceRoleClient()

  const { data: praticiens } = await supabase
    .from('users')
    .select('email')
    .eq('organization_id', job.organizationId)
    .or('role.eq.praticien,role.eq.admin')

  const template = await loadTemplate(job.organizationId, 'cambio_praticien', 'email', appt.organizations?.langue ?? 'es')
  if (!template) {
    throw new Error('Template cambio_praticien introuvable')
  }

  const body = renderTemplate(template.corps, appt, { cancelado })
  const subject = template.sujet ? renderTemplate(template.sujet, appt, { cancelado }) : 'Alerte praticien'

  const emails = (praticiens ?? []).map((u) => u.email).filter(Boolean)
  if (emails.length === 0) {
    throw new Error('Aucun email praticien trouvé')
  }

  await sendEmail(emails[0], subject, body)

  // upsert (pas insert) : contrairement a pago_praticien, un meme RDV peut etre reprogramme
  // plusieurs fois -- la contrainte unique (appointment_id, canal, type) ferait echouer un
  // second insert, alors que l'email, lui, doit repartir a chaque fois.
  await supabase.from('notifications').upsert(
    {
      appointment_id: job.appointmentId,
      canal: 'email',
      type: 'cambio_praticien',
      statut: 'sent',
      sent_at: new Date().toISOString(),
    },
    { onConflict: 'appointment_id,canal,type' }
  )
}

export async function dispatch(job: NotificationJob) {
  const supabase = createServiceRoleClient()

  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*, patients(*), organizations(*, org_settings(*))')
    .eq('id', job.appointmentId)
    .single()

  if (error || !appt) {
    console.error('dispatch: appointment introuvable', error)
    return
  }

  const typedAppt = appt as AppointmentWithRelations
  const settings = typedAppt.organizations?.org_settings
  // Bascule explicite par organisation, jamais automatique -- 'unipile' reste le defaut tant que
  // Martin n'a pas lui-meme repointe canal_whatsapp_provider en base pour cette organisation.
  const whatsappProvider: 'unipile' | 'twilio' = settings?.canal_whatsapp_provider === 'twilio' ? 'twilio' : 'unipile'

  if (job.type === 'pago_praticien') {
    try {
      await sendPraticienAlert(typedAppt, job)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('sendPraticienAlert error:', msg)
      await alertAdmin(job, 'email', msg)
    }
    return
  }

  if (job.type === 'cambio_praticien') {
    try {
      await sendCambioPraticienAlert(typedAppt, job, job.cancelado ?? false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('sendCambioPraticienAlert error:', msg)
      await alertAdmin(job, 'email', msg)
    }
    return
  }

  // Contrairement aux autres types (lies a un evenement qui n'arrive qu'une fois dans la vie
  // d'un RDV), 'reprogramacion' peut legitimement se reproduire plusieurs fois pour le meme RDV
  // (le patient peut reprogrammer plusieurs fois) -- pas de garde "deja envoye", et upsert au lieu
  // d'insert plus bas pour ne pas violer la contrainte unique (appointment_id, canal, type).
  const isRepeatable = job.type === 'reprogramacion'

  const channels: Array<'email' | 'whatsapp'> = []
  if (settings?.canal_email) channels.push('email')
  // unipile_account_id n'a de sens que pour le provider unipile -- une organisation en twilio n'en
  // a jamais besoin (et inversement un compte Twilio ne doit pas etre exige pour rester sur unipile).
  const hasWhatsappAccountConfigured =
    whatsappProvider === 'twilio' ? Boolean(settings?.twilio_subaccount_sid) : Boolean(settings?.unipile_account_id)
  if (settings?.canal_whatsapp && hasWhatsappAccountConfigured) channels.push('whatsapp')

  for (const canal of channels) {
    if (!isRepeatable) {
      const { data: alreadySent } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', job.appointmentId)
        .eq('canal', canal)
        .eq('type', job.type)
        .eq('statut', 'sent')
        .maybeSingle()

      if (alreadySent) continue
    }

    const langue = typedAppt.organizations?.langue ?? 'es'
    const template = await loadTemplate(job.organizationId, job.type, canal, langue)
    if (!template) {
      console.warn(`Template manquant: ${job.type} / ${canal} / ${langue}`)
      continue
    }

    const body = renderTemplate(template.corps, typedAppt)
    const subject = template.sujet ? renderTemplate(template.sujet, typedAppt) : job.type

    // La chauffe n'a de sens que pour Unipile (session WhatsApp Web emulee, risque de bannissement) --
    // l'API officielle Twilio n'a pas ce risque, aucune verification equivalente ne s'applique.
    if (canal === 'whatsapp' && whatsappProvider === 'unipile') {
      const warmingCheck = await checkWhatsappWarming(supabase, job.organizationId, settings?.unipile_connected_at ?? null)
      if (!warmingCheck.allowed) {
        console.warn(`dispatch whatsapp throttled: ${warmingCheck.reason}`)
        const warmingRow = {
          appointment_id: job.appointmentId,
          canal,
          type: job.type,
          statut: 'failed' as const,
          error_message: warmingCheck.reason,
          sent_at: null,
        }
        if (isRepeatable) {
          await supabase.from('notifications').upsert(warmingRow, { onConflict: 'appointment_id,canal,type' })
        } else {
          await supabase.from('notifications').insert(warmingRow)
        }
        continue
      }
    }

    let statut: 'sent' | 'failed' = 'failed'
    let errorMessage: string | undefined
    let twilioMessageSid: string | undefined

    try {
      if (canal === 'email') {
        const to = typedAppt.patients?.email
        if (!to) throw new Error('Email patient manquant')
        await sendEmail(to, subject, body)
      }
      if (canal === 'whatsapp') {
        const phone = typedAppt.patients?.telefono
        if (!phone) throw new Error('Téléfono patient manquant')

        if (whatsappProvider === 'twilio') {
          const { twilio_subaccount_sid: subaccountSid, twilio_whatsapp_number: fromNumber, twilio_auth_token_encrypted: authTokenEncrypted } =
            settings ?? {}
          if (!subaccountSid || !fromNumber || !authTokenEncrypted) {
            throw new Error('Configuración de Twilio incompleta (subaccount, número o token)')
          }

          let authToken: string
          try {
            authToken = decryptSecret(authTokenEncrypted)
          } catch (decryptError) {
            console.error('dispatch: erreur dechiffrement twilio_auth_token_encrypted', decryptError)
            throw new Error('Token Twilio corrupto o no descifrable')
          }

          // Variante choisie par l'organisation pour ce type de notification (meme source que les
          // templates Unipile/email, cf. org_settings.variantes_mensaje ecrit par updateSettings).
          const variantes = (settings?.variantes_mensaje ?? {}) as Partial<Record<NotificationType, VariantId>>
          const variant: VariantId = variantes[job.type as NotificationType] === 'calido' ? 'calido' : 'standard'
          const contentSid = getTwilioContentSid(job.type as NotificationType, variant, langue as 'es' | 'pt')

          if (!contentSid) {
            // Pas un crash : erreur claire et loggee, le praticien doit configurer son template Meta
            // avant que ce type de notification puisse partir par Twilio pour son organisation.
            throw new Error(`Template Twilio no configurado para ${job.type} (${variant}/${langue})`)
          }

          const templateValues = buildTemplateValues(typedAppt)
          const statusCallbackUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
            : undefined

          const result = await sendWhatsAppTwilio(
            subaccountSid,
            authToken,
            fromNumber,
            phone,
            contentSid,
            templateValues,
            statusCallbackUrl
          )
          twilioMessageSid = result.sid
        } else {
          const accountId = settings?.unipile_account_id
          if (!accountId) throw new Error('Compte Unipile manquant')
          await sendWhatsApp(accountId, phone, body)
        }
      }
      statut = 'sent'
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`dispatch error ${canal}:`, errorMessage)
      await alertAdmin(job, canal, errorMessage)
    }

    const resultRow = {
      appointment_id: job.appointmentId,
      canal,
      type: job.type,
      statut,
      error_message: errorMessage,
      sent_at: statut === 'sent' ? new Date().toISOString() : null,
      ...(twilioMessageSid ? { twilio_message_sid: twilioMessageSid } : {}),
    }
    if (isRepeatable) {
      await supabase.from('notifications').upsert(resultRow, { onConflict: 'appointment_id,canal,type' })
    } else {
      await supabase.from('notifications').insert(resultRow)
    }
  }
}
