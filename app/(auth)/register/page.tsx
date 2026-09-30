'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { useLocale, MESSAGES } from '@/lib/hooks/useLocale'

export default function RegisterPage() {
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom, idioma: locale }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || null)
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Colonne gauche */}
      <div className="hidden md:flex md:w-[42%] relative flex-col justify-between overflow-hidden bg-[#1a1a2e] p-14">
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute bottom-10 -right-16 h-52 w-52 rounded-full bg-white/[0.05]" />

        <div className="relative z-10">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
            {MESSAGES[locale].tagline}
          </div>
          <div className="text-3xl font-semibold text-white">Núcleo</div>
        </div>

        <div className="relative z-10 h-[380px] w-full">
          <Image
            src="/images/duo_praticiens.png"
            alt="Praticiens Núcleo"
            fill
            className="object-contain object-bottom"
          />
        </div>
      </div>

      {/* Colonne droite */}
      <div className="relative flex flex-1 items-center justify-center bg-[#f7f5f0] px-6 py-16">
        <div className="absolute top-6 right-6 flex gap-2">
          <button
            type="button"
            onClick={() => setLocale('es')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              locale === 'es'
                ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#5b21b6]'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            <span>🇪🇸</span> Español
          </button>
          <button
            type="button"
            onClick={() => setLocale('pt')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              locale === 'pt'
                ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#5b21b6]'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            <span>🇧🇷</span> Português
          </button>
        </div>

        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
          <RegisterFormFields
            nom={nom}
            setNom={setNom}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </NextIntlClientProvider>
      </div>
    </div>
  )
}

function RegisterFormFields({
  nom,
  setNom,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}: {
  nom: string
  setNom: (v: string) => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  error: string | null
  loading: boolean
  onSubmit: (e: FormEvent) => void
}) {
  const t = useTranslations('register')

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-3xl font-semibold text-[#1a1a1a]">{t('title')}</h1>
      <p className="mb-8 text-sm text-[#666666]">{t('subtitle')}</p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error || t('genericError')}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
            {t('orgName')}
          </label>
          <input
            id="nom"
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
            {t('password')}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50"
        >
          {loading ? t('submitLoading') : t('submit')}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#666666]">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-[#7C3AED] hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  )
}
