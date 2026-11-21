import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Script one-off en lecture seule : diagnostique pourquoi dispatch() n'envoie ni erreur ni WhatsApp
// pour un RDV donne. Verifie org_settings (canal_whatsapp, config Twilio) et les dernieres lignes
// notifications/appointments pour le patient de test.
// Usage : npx tsx scripts/check-org-settings.ts <organization_id>
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()
  const [organizationId] = process.argv.slice(2)
  if (!organizationId) {
    console.error('Usage: npx tsx scripts/check-org-settings.ts <organization_id>')
    process.exit(1)
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const supabase = createServiceRoleClient()

  const { data: settings, error: settingsError } = await supabase
    .from('org_settings')
    .select(
      'canal_email, canal_whatsapp, twilio_subaccount_sid, twilio_whatsapp_number, twilio_auth_token_encrypted, variantes_mensaje'
    )
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (settingsError) {
    console.error('Erreur org_settings:', settingsError.message)
    process.exit(1)
  }
  if (!settings) {
    console.error('Aucune ligne org_settings pour cette organisation.')
    process.exit(1)
  }

  console.log('--- org_settings ---')
  console.log('canal_email            :', settings.canal_email)
  console.log('canal_whatsapp         :', settings.canal_whatsapp)
  console.log('twilio_subaccount_sid  :', settings.twilio_subaccount_sid)
  console.log('twilio_whatsapp_number :', settings.twilio_whatsapp_number)
  console.log('twilio_auth_token_encrypted present :', Boolean(settings.twilio_auth_token_encrypted))
  console.log('variantes_mensaje      :', JSON.stringify(settings.variantes_mensaje))

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita, statut, created_at, patients(nombre:nom, telefono, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (apptError) {
    console.error('Erreur appointments:', apptError.message)
  } else {
    console.log('\n--- 5 derniers appointments ---')
    for (const a of appointments ?? []) {
      console.log(JSON.stringify(a))
    }

    const ids = (appointments ?? []).map((a) => a.id)
    if (ids.length > 0) {
      const { data: notifs, error: notifError } = await supabase
        .from('notifications')
        .select('appointment_id, canal, type, statut, error_message, sent_at')
        .in('appointment_id', ids)

      if (notifError) {
        console.error('Erreur notifications:', notifError.message)
      } else {
        console.log('\n--- notifications correspondantes ---')
        for (const n of notifs ?? []) {
          console.log(JSON.stringify(n))
        }
        if (!notifs || notifs.length === 0) {
          console.log('(aucune ligne notifications -- dispatch() n a jamais atteint le bloc email/whatsapp pour ces RDV)')
        }
      }
    }
  }
}

main().catch((e) => {
  console.error('Erreur inattendue :', e)
  process.exit(1)
})
