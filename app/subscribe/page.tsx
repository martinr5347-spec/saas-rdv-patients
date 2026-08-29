'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ExpiredNotice() {
  const searchParams = useSearchParams()
  if (searchParams.get('expired') !== '1') return null
  return (
    <p className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md py-2 px-3">
      Votre essai a expiré. Choisissez une option ci-dessous pour continuer.
    </p>
  )
}

export default function SubscribePage() {
  const router = useRouter()
  const [loadingTrial, setLoadingTrial] = useState(false)
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTrial() {
    setLoadingTrial(true)
    setError(null)

    const res = await fetch('/api/subscription/trial', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Erreur activation de l'essai")
      setLoadingTrial(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  async function handleStripe() {
    setLoadingStripe(true)
    setError(null)

    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'fondateur' }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur paiement')
      setLoadingStripe(false)
      return
    }

    if (data.url) {
      window.location.href = data.url
    } else {
      setError('Redirection Stripe manquante')
      setLoadingStripe(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Activez votre compte</h1>
          <p className="text-gray-600">Votre compte est créé. Choisissez une option pour accéder au dashboard.</p>
        </div>

        <Suspense fallback={null}>
          <ExpiredNotice />
        </Suspense>

        {error && <p className="text-center text-red-600 text-sm">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl shadow space-y-4 flex flex-col">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Essai gratuit 7 jours</h2>
              <p className="text-sm text-gray-600">Aucune carte bancaire requise. Accès complet pendant 7 jours.</p>
            </div>
            <button
              onClick={handleTrial}
              disabled={loadingTrial}
              className="mt-auto w-full rounded-md border border-blue-600 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 disabled:opacity-50"
            >
              {loadingTrial ? 'Activation...' : "Commencer l'essai gratuit"}
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow space-y-4 flex flex-col border-2 border-blue-600">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Fondateur — 49,99€/mois</h2>
              <p className="text-sm text-gray-600">Premiers 10 clients — prix bloqué à vie.</p>
            </div>
            <button
              onClick={handleStripe}
              disabled={loadingStripe}
              className="mt-auto w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingStripe ? 'Chargement...' : 'Payer avec Stripe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
