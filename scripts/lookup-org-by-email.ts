import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Script one-off en lecture seule : retrouve l'organization_id a partir de l'email d'un praticien.
// Usage : npx tsx scripts/lookup-org-by-email.ts <email>
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
  const [email] = process.argv.slice(2)
  if (!email) {
    console.error('Usage: npx tsx scripts/lookup-org-by-email.ts <email>')
    process.exit(1)
  }

  console.log('NEXT_PUBLIC_SUPABASE_URL lue depuis .env.local :', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('SUPABASE_SERVICE_ROLE_KEY presente :', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))

  // Test reseau direct (sans passer par le client Supabase) pour isoler si le probleme est DNS/TLS
  // vers ce domaine precis, independamment de la librairie supabase-js.
  try {
    const testUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`
    console.log('Test fetch direct vers :', testUrl)
    const res = await fetch(testUrl)
    console.log('Reponse fetch direct :', res.status)
  } catch (fetchErr) {
    console.error('Fetch direct a echoue :', fetchErr)
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const supabase = createServiceRoleClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, organization_id, role, nom')
    .eq('email', email)
    .maybeSingle()

  if (userError) {
    console.error(`Erreur: ${userError.message}`)
    process.exit(1)
  }
  if (!user) {
    console.error(`Aucun utilisateur trouve pour ${email}`)
    process.exit(1)
  }
  if (!user.organization_id) {
    console.error(`Utilisateur trouve (${user.nom ?? user.email}) mais sans organization_id.`)
    process.exit(1)
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, nom')
    .eq('id', user.organization_id)
    .maybeSingle()

  if (orgError || !org) {
    console.error(`organization_id trouve (${user.organization_id}) mais organisation introuvable.`)
    process.exit(1)
  }

  console.log(`Utilisateur : ${user.nom ?? user.email} (role: ${user.role})`)
  console.log(`Organisation : ${org.nom}`)
  console.log(`organization_id : ${org.id}`)
}

main().catch((e) => {
  console.error('Erreur inattendue :', e)
  if (e && e.cause) console.error('Cause :', e.cause)
  console.error('NEXT_PUBLIC_SUPABASE_URL vue par le script :', process.env.NEXT_PUBLIC_SUPABASE_URL)
  process.exit(1)
})
