'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [plan, setPlan] = useState('fondateur')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom, plan }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur inscription')
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
      <div className="max-w-sm w-full space-y-6 bg-white p-8 rounded-xl shadow">
        <h1 className="text-2xl font-semibold text-center">Inscription praticien</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nom" className="block text-sm font-medium">Nom du cabinet / praticien</label>
            <input
              id="nom"
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="fondateur">Fondateur — 49,99€/mois</option>
              <option value="standard">Standard — 69,99€/mois</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Inscription...' : "Payer et s'inscrire"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
