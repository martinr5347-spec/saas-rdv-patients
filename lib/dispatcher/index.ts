import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from './channels/email'
import { sendWhatsApp } from './channels/whatsapp'
import { NotificationJob } from './types'
import { Database } from '@/types/database'
import { getDailyLimit, startOfTodayIso, MIN_SECONDS_BETWEEN_MESSAGES } from './warming'

type Appointment = Database['public']['Tables']['appointments']['Row']
type OrgSettings = Database['public']['Tables']['org_settings']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']
type Patient = Database['public']['Tables']['patients']['Row']
type Template = Database['public']['Tables']['message_templates']['Row']

interface AppointmentWithRelations extends Appointment {
  patients: Patient | null
  organizations: (Organization & { org_settings: OrgSettings | null }) | null
}

function renderTemplate(corps: string, appt: AppointmentWithRelations) {
  const patient = appt.patients
  const org = appt.organizations
  const settings = org?.org_settings

  const monto = typeof appt.monto_acompte === 'number' ? appt.monto_acompte.toFixed(2) : appt.monto_acompte

  return corps
    .replace(/\{\{nom_patient\}\}/g, patient?.nom ?? '')
    .replace(/\{\{fecha_cita\}\}/g, appt.fecha_cita ?? '')
    .replace(/\{\{hora_cita\}\}/g, appt.hora_cita ?? '')
    .replace(/\{\{link_pago\}\}/g, appt.link_pago ?? '')
    .replace(/\{\{monto_acompte\}\}/g, monto)
    .replace(/\{\{monnaie\}\}/g, settings?.monnaie ?? 'PEN')
    .replace(/\{\{nombre_cabinet\}\}/g, org?.nom ?? '')
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
  const subject = template.sujet ?? 'Alerte praticien'

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

  const channels: Array<'email' | 'whatsapp'> = []
  if (settings?.canal_email) channels.push('email')
  if (settings?.canal_whatsapp && settings?.unipile_account_id) channels.push('whatsapp')

  for (const canal of channels) {
    const { data: alreadySent } = await supabase
      .from('notifications')
      .select('id')
      .eq('appointment_id', job.appointmentId)
      .eq('canal', canal)
      .eq('type', job.type)
      .eq('statut', 'sent')
      .maybeSingle()

    if (alreadySent) continue

    const langue = typedAppt.organizations?.langue ?? 'es'
    const template = await loadTemplate(job.organizationId, job.type, canal, langue)
    if (!template) {
      console.warn(`Template manquant: ${job.type} / ${canal} / ${langue}`)
      continue
    }

    const body = renderTemplate(template.corps, typedAppt)
    const subject = template.sujet ?? job.type

    if (canal === 'whatsapp') {
      const warmingCheck = await checkWhatsappWarming(supabase, job.organizationId, settings?.unipile_connected_at ?? null)
      if (!warmingCheck.allowed) {
        console.warn(`dispatch whatsapp throttled: ${warmingCheck.reason}`)
        await supabase.from('notifications').insert({
          appointment_id: job.appointmentId,
          canal,
          type: job.type,
          statut: 'failed',
          error_message: warmingCheck.reason,
          sent_at: null,
        })
        continue
      }
    }

    let statut: 'sent' | 'failed' = 'failed'
    let errorMessage: string | undefined

    try {
      if (canal === 'email') {
        const to = typedAppt.patients?.email
        if (!to) throw new Error('Email patient manquant')
        await sendEmail(to, subject, body)
      }
      if (canal === 'whatsapp') {
        const phone = typedAppt.patients?.telefono
        const accountId = settings?.unipile_account_id
        if (!phone || !accountId) throw new Error('Téléphone ou compte Unipile manquant')
        await sendWhatsApp(accountId, phone, body)
      }
      statut = 'sent'
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e)
      console.error(`dispatch error ${canal}:`, errorMessage)
      await alertAdmin(job, canal, errorMessage)
    }

    await supabase.from('notifications').insert({
      appointment_id: job.appointmentId,
      canal,
      type: job.type,
      statut,
      error_message: errorMessage,
      sent_at: statut === 'sent' ? new Date().toISOString() : null,
    })
  }
}
