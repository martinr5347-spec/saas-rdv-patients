import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { meetsMinimumPasswordRule } from '@/lib/utils/passwordStrength'
import { seedActosIfEmpty } from '@/lib/patients/actosCatalog'
import { PAISES_LATAM, monedaParaPais } from '@/lib/constants/paisesLatam'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, nom, idioma, especialidad, pais } = body

    if (!email || !password || !nom) {
      return NextResponse.json({ error: 'Email, mot de passe et nom sont requis' }, { status: 400 })
    }

    const userIdioma = idioma === 'pt' ? 'pt' : 'es'

    // Meme regle que le formulaire (lib/utils/passwordStrength.ts) -- revalidee ici pour ne pas
    // etre contournable en appelant cette route directement sans passer par l'UI.
    if (!meetsMinimumPasswordRule(password)) {
      const messages = userIdioma === 'pt' ? ptMessages : esMessages
      return NextResponse.json({ error: messages.register.passwordRuleError }, { status: 400 })
    }
    const orgEspecialidad =
      especialidad === 'estetica_dermato' || especialidad === 'clinica_medica' ? especialidad : null
    // Pays choisi a l'inscription -- fallback propre vers PE (meme defaut que la colonne SQL,
    // cf. migration 001) si absent ou hors liste, jamais bloquant pour l'inscription.
    const orgPais = PAISES_LATAM.some((p) => p.pais === pais) ? (pais as string) : 'PE'
    // Devise de depart deduite du pays reel (et non plus de la langue, qui ne couvrait pas
    // AR/CL/CO/MX/UY) -- modifiable ensuite independamment dans Configuracion.
    const defaultMonnaie = monedaParaPais(orgPais)

    const supabase = createServiceRoleClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('Erreur création utilisateur:', authError)
      return NextResponse.json({ error: authError?.message || 'Erreur création compte' }, { status: 400 })
    }

    const userId = authData.user.id

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ nom, langue: userIdioma, especialidad: orgEspecialidad, pays: orgPais })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('Erreur création organization:', orgError)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erreur création cabinet' }, { status: 500 })
    }

    const [userResult, settingsResult, subscriptionResult] = await Promise.all([
      supabase.from('users').insert({
        id: userId,
        organization_id: org.id,
        role: 'praticien',
        nom,
        email,
        idioma: userIdioma,
      }),
      supabase.from('org_settings').insert({
        organization_id: org.id,
        monnaie: defaultMonnaie,
      }),
      supabase.from('subscriptions').insert({
        organization_id: org.id,
        statut: 'pending',
      }),
    ])

    const setupError = userResult.error || settingsResult.error || subscriptionResult.error
    if (setupError) {
      console.error('Erreur initialisation compte:', setupError)
      await supabase.from('organizations').delete().eq('id', org.id)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erreur création cabinet' }, { status: 500 })
    }

    // Liste de depart d'actes facturables selon le profil du cabinet -- jamais bloquant si ca
    // echoue (organisation deja creee avec succes a ce stade), juste logue.
    try {
      await seedActosIfEmpty(supabase, org.id, orgEspecialidad)
    } catch (e) {
      console.error('Erreur seed actos a l\'inscription:', e)
    }

    const sessionClient = createClient()
    const { error: signInError } = await sessionClient.auth.signInWithPassword({ email, password })

    if (signInError) {
      console.error('Erreur connexion après inscription:', signInError)
      return NextResponse.json({ error: 'Compte créé, merci de vous connecter manuellement' }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erreur inscription:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
