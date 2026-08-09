import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY manquante')
  }
  if (!_stripe) {
    _stripe = new Stripe(key, {
      apiVersion: '2026-07-29.dahlia',
    })
  }
  return _stripe
}

export { Stripe }
