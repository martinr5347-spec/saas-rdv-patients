import { NextResponse } from 'next/server'
import { getStripe, Stripe } from '@/lib/payments/stripe'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organization_id

        if (!organizationId) {
          console.error('Stripe webhook missing organization_id')
          return NextResponse.json({ ok: true })
        }

        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('organization_id', organizationId)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              statut: 'active',
              stripe_sub_id: session.subscription as string | undefined,
              periode_debut: new Date().toISOString(),
            })
            .eq('organization_id', organizationId)
        } else {
          await supabase.from('subscriptions').insert({
            organization_id: organizationId,
            stripe_customer_id: session.customer as string | undefined,
            stripe_sub_id: session.subscription as string | undefined,
            plan: 'fondateur',
            statut: 'active',
            periode_debut: new Date().toISOString(),
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from('subscriptions')
          .update({ statut: 'past_due' })
          .eq('stripe_customer_id', invoice.customer as string)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ statut: 'canceled' })
          .eq('stripe_sub_id', subscription.id)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Erreur traitement webhook Stripe:', err)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ received: true })
}
