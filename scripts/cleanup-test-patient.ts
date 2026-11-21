import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Script one-off : supprime le patient de test (et ses RDV/notifications) cree pendant les tests
// end-to-end WhatsApp pour l'organisation de Rocio. Ordre impose par les FK :
// appointments.patient_id est "on delete restrict" -- il faut supprimer les appointments
// (notifications suit en cascade) avant de pouvoir supprimer le patient.
// Usage : npx tsx scripts/cleanup-test-patient.ts <organization_id> <email_patient_test>
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
  const [organizationId, email] = process.argv.slice(2)
  if (!organizationId || !email) {
    console.error('Usage: npx tsx scripts/cleanup-test-patient.ts <organization_id> <email_patient_test>')
    process.exit(1)
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const supabase = createServiceRoleClient()

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, nom, email')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .maybeSingle()

  if (patientError) {
    console.error('Erreur recherche patient:', patientError.message)
    process.exit(1)
  }
  if (!patient) {
    console.log(`Aucun patient trouve pour ${email} dans cette organisation -- rien a supprimer.`)
    return
  }

  console.log(`Patient trouve : ${patient.nom} (${patient.email}), id=${patient.id}`)

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, fecha_cita, hora_cita')
    .eq('patient_id', patient.id)

  if (apptError) {
    console.error('Erreur recherche appointments:', apptError.message)
    process.exit(1)
  }

  console.log(`${appointments?.length ?? 0} appointment(s) a supprimer :`)
  for (const a of appointments ?? []) {
    console.log(`  - ${a.id} (${a.fecha_cita} ${a.hora_cita})`)
  }

  if (appointments && appointments.length > 0) {
    const { error: deleteApptError } = await supabase
      .from('appointments')
      .delete()
      .in(
        'id',
        appointments.map((a) => a.id)
      )
    if (deleteApptError) {
      console.error('Erreur suppression appointments:', deleteApptError.message)
      process.exit(1)
    }
    console.log('Appointments supprimes (notifications liees supprimees en cascade).')
  }

  const { error: deletePatientError } = await supabase.from('patients').delete().eq('id', patient.id)
  if (deletePatientError) {
    console.error('Erreur suppression patient:', deletePatientError.message)
    process.exit(1)
  }

  console.log('Patient de test supprime avec succes.')
}

main().catch((e) => {
  console.error('Erreur inattendue :', e)
  process.exit(1)
})
