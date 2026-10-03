import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, nom, idioma, especialidad } = body

    if (!email || !password || !nom) {
      return NextResponse.json({ error: 'Email, mot de passe et nom sont requis' }, { status: 400 })
    }

    const userIdioma = idioma === 'pt' ? 'pt' : 'es'
    const orgEspecialidad =
      especialidad === 'estetica_dermato' || especialidad === 'clinica_medica' ? especialidad : null
    // Valeurs de depart pour le cabinet (langue des messages patients, devise) —
    // reprennent la langue choisie a l'inscription comme defaut raisonnable,
    // modifiables ensuite independamment dans Parametres.
    const defaultMonnaie = userIdioma === 'pt' ? 'BRL' : 'PEN'

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
      .insert({ nom, langue: userIdioma, especialidad: orgEspecialidad })
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
