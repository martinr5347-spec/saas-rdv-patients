'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useLocale, MESSAGES } from '@/lib/hooks/useLocale'
import { MailIcon, LockIcon } from '@/components/auth/icons'

export default function LoginPage() {
  const { locale, setLocale } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
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
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Image src="/images/nucleo-icon-inverse.png" alt="Núcleo" width={36} height={36} />
            <span className="text-3xl font-semibold text-white">Núcleo</span>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
            <Image
              src="/images/hero-characters.png"
              alt="Praticiens Núcleo"
              fill
              className="object-cover"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-white/90">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6926D2]" />
            {MESSAGES[locale].login.featureBadge}
          </div>
        </div>
      </div>

      {/* Colonne droite */}
      <div className="relative flex flex-1 items-center justify-center bg-[#F5F0E8] px-6 py-16">
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
          <LoginFormFields
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

function LoginFormFields({
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  error: string | null
  loading: boolean
  onSubmit: (e: FormEvent) => void
}) {
  const t = useTranslations('login')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-3xl font-semibold text-[#1a1a1a]">{t('title')}</h1>
      <p className="mb-8 text-sm text-[#666666]">{t('subtitle')}</p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
            {t('email')}
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
            {t('password')}
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#666666]"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#7C3AED]/30 hover:bg-[#6d28d9] disabled:opacity-50"
        >
          {loading ? t('submitLoading') : t('submit')}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#999999]">
        <LockIcon className="h-3.5 w-3.5" />
        {t('dataProtected')}
      </div>

      <p className="mt-6 text-center text-sm text-[#666666]">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-[#7C3AED] hover:underline">
          {t('register')}
        </Link>
      </p>
    </div>
  )
}
