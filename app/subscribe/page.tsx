'use client'

import { useState } from 'react'

export default function SubscribePage() {
  const [plan, setPlan] = useState('fondateur')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur paiement')
      setLoading(false)
      return
    }

    if (data.url) {
      window.location.href = data.url
    } else {
      setError('Redirection Stripe manquante')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-2xl font-semibold">Activez votre abonnement</h1>
        <p className="text-gray-600">Votre compte est créé. Choisissez un plan pour accéder au dashboard.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="fondateur">Fondateur — 49,99€/mois</option>
          <option value="standard">Standard — 69,99€/mois</option>
        </select>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Payer avec Stripe'}
        </button>
      </div>
    </div>
  )
}
