import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Script one-off lance a la main par Martin (jamais d'interface web/route API) pour configurer
// le compte Twilio d'une organisation -- cf. prompt "Retirer les champs Twilio de la page Settings
// du praticien" : ce compte est gere et paye entierement par Martin, jamais par le praticien.
// Usage : npx tsx scripts/set-twilio-org.ts <organization_id> <subaccount_sid> <whatsapp_number> <auth_token_en_clair>

// Ce script tourne hors Next.js (npx tsx), qui est le seul a charger .env.local automatiquement.
// lib/crypto/settingsEncryption lit process.env.SETTINGS_ENCRYPTION_KEY au chargement du module --
// chargement manuel de .env.local puis import dynamique des modules plus bas pour garantir l'ordre.
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

  const [organizationId, subaccountSid, whatsappNumber, authTokenEnClair] = process.argv.slice(2)
  if (!organizationId || !subaccountSid || !whatsappNumber || !authTokenEnClair) {
    console.error(
      'Usage: npx tsx scripts/set-twilio-org.ts <organization_id> <subaccount_sid> <whatsapp_number> <auth_token_en_clair>'
    )
    process.exit(1)
  }

  const { createServiceRoleClient } = await import('@/lib/supabase/admin')
  const { encryptSecret, decryptSecret } = await import('@/lib/crypto/settingsEncryption')

  const supabase = createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, nom')
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError) {
    console.error(`Erreur lors de la verification de l'organisation : ${orgError.message}`)
    process.exit(1)
  }
  if (!org) {
    console.error(`Organisation introuvable pour l'id ${organizationId} -- rien n'a ete ecrit.`)
    process.exit(1)
  }

  const encrypted = encryptSecret(authTokenEnClair)

  // Verification bout en bout avant ecriture : le format chiffre doit se dechiffrer en exactement
  // le token fourni, sinon dispatch() echouerait plus tard avec "Token Twilio corrupto o no
  // descifrable" sans que personne ne s'en rende compte avant un vrai envoi WhatsApp.
  if (decryptSecret(encrypted) !== authTokenEnClair) {
    console.error("Le chiffrement/dechiffrement du token ne correspond pas -- rien n'a ete ecrit.")
    process.exit(1)
  }

  // upsert (pas update) : une organisation peut en theorie ne pas encore avoir de ligne
  // org_settings -- un simple update echouerait alors silencieusement (0 ligne affectee, pas
  // d'erreur). onConflict sur organization_id (cle primaire de org_settings) : relancer le script
  // sur la meme organisation remplace les valeurs existantes, jamais de doublon de ligne.
  const { error: upsertError } = await supabase
    .from('org_settings')
    .upsert(
      {
        organization_id: organizationId,
        twilio_subaccount_sid: subaccountSid,
        twilio_whatsapp_number: whatsappNumber,
        twilio_auth_token_encrypted: encrypted,
        canal_whatsapp_provider: 'twilio',
      },
      { onConflict: 'organization_id' }
    )

  if (upsertError) {
    console.error(`Erreur lors de l'ecriture en base : ${upsertError.message}`)
    process.exit(1)
  }

  console.log(`Twilio configure pour l'organisation "${org.nom}" (${organizationId}).`)
  console.log(`  subaccount_sid          : ${subaccountSid}`)
  console.log(`  whatsapp_number         : ${whatsappNumber}`)
  console.log(`  auth_token              : chiffre en base (${encrypted.length} caracteres), jamais affiche en clair`)
  console.log(`  canal_whatsapp_provider : twilio`)
}

main().catch((e) => {
  console.error('Erreur inattendue :', e)
  process.exit(1)
})
