import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/payments/stripe'

const priceByPlan: Record<string, string | undefined> = {
  fondateur: process.env.STRIPE_PRICE_FONDATEUR,
  standard: process.env.STRIPE_PRICE_STANDARD,
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const plan = typeof body.plan === 'string' && ['fondateur', 'standard'].includes(body.plan) ? body.plan : 'fondateur'
    const priceId = priceByPlan[plan]

    if (!priceId) {
      return NextResponse.json({ error: 'Configuration Stripe incomplète' }, { status: 500 })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, email, nom')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Profil incomplet' }, { status: 400 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    let customerId = subscription?.stripe_customer_id
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: profile.email,
        name: profile.nom ?? undefined,
        metadata: { organization_id: profile.organization_id },
      })
      customerId = customer.id
      await supabase.from('subscriptions').upsert(
        {
          organization_id: profile.organization_id,
          stripe_customer_id: customerId,
          plan,
          statut: 'pending',
        },
        { onConflict: 'organization_id' }
      )
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe`,
      metadata: { organization_id: profile.organization_id, user_id: user.id },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Erreur création session Stripe' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Erreur create checkout:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
