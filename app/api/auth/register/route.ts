import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/payments/stripe'

const priceByPlan: Record<string, string | undefined> = {
  fondateur: process.env.STRIPE_PRICE_FONDATEUR,
  standard: process.env.STRIPE_PRICE_STANDARD,
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, nom, plan = 'fondateur' } = body

    if (!email || !password || !nom) {
      return NextResponse.json({ error: 'Email, mot de passe et nom sont requis' }, { status: 400 })
    }

    if (!['fondateur', 'standard'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const priceId = priceByPlan[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Configuration Stripe incomplète' }, { status: 500 })
    }

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
      .insert({ nom })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('Erreur création organization:', orgError)
      return NextResponse.json({ error: 'Erreur création cabinet' }, { status: 500 })
    }

    await Promise.all([
      supabase.from('users').insert({
        id: userId,
        organization_id: org.id,
        role: 'praticien',
        nom,
        email,
      }),
      supabase.from('org_settings').insert({
        organization_id: org.id,
      }),
      supabase.from('subscriptions').insert({
        organization_id: org.id,
        plan,
        statut: 'pending',
      }),
    ])

    const customer = await getStripe().customers.create({
      email,
      name: nom,
      metadata: { organization_id: org.id },
    })

    await supabase.from('subscriptions').update({ stripe_customer_id: customer.id }).eq('organization_id', org.id)

    const session = await getStripe().checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
      metadata: { organization_id: org.id, user_id: userId },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Erreur création session Stripe' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Erreur inscription:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
