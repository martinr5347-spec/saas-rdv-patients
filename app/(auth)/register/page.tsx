'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { useLocale, MESSAGES } from '@/lib/hooks/useLocale'
import { MailIcon, LockIcon } from '@/components/auth/icons'

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path strokeLinecap="round" d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21" />
    </svg>
  )
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  )
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2.75 2.75 0 0 0 3.9 3.9M7 7.2C4.6 8.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.3-.5 4.6-1.3M12 5.5c6 0 9.5 6.5 9.5 6.5a14 14 0 0 1-2.4 3.1" />
    </svg>
  )
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
      <path strokeLinecap="round" d="M19 15.5v3M17.5 17h3" />
    </svg>
  )
}

function StethoscopeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.5v6a4 4 0 0 0 8 0v-6" />
      <path strokeLinecap="round" d="M10 13.5v2.25a5 5 0 0 0 10 0v-1.5" />
      <circle cx="20.5" cy="14" r="1.5" />
      <path strokeLinecap="round" d="M6 3.5H4.5M10 3.5H8.5" />
    </svg>
  )
}

function BoltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 2 4 13.5h6.2L10.5 22 20 10h-6.3L13 2Z" />
    </svg>
  )
}

export default function RegisterPage() {
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [especialidad, setEspecialidad] = useState<'estetica_dermato' | 'clinica_medica'>('estetica_dermato')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom, idioma: locale, especialidad }),
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
        <div className="relative z-10">
          <div className="text-3xl font-semibold text-white">Núcleo</div>
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
          <RegisterFormFields
            nom={nom}
            setNom={setNom}
            especialidad={especialidad}
            setEspecialidad={setEspecialidad}
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
  especialidad,
  setEspecialidad,
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
  especialidad: 'estetica_dermato' | 'clinica_medica'
  setEspecialidad: (v: 'estetica_dermato' | 'clinica_medica') => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  error: string | null
  loading: boolean
  onSubmit: (e: FormEvent) => void
}) {
  const t = useTranslations('register')
  const [showPassword, setShowPassword] = useState(false)
  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#1a1a1a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]'
  const sectionLabelClass = 'mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#999999]'
  const iconWrapClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]'

  return (
    <div className="w-full max-w-sm">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-medium text-[#5b21b6]">
        <BoltIcon className="h-3.5 w-3.5" />
        {t('trialBadge')}
      </div>
      <h1 className="mb-2 text-3xl font-semibold text-[#1a1a1a]">{t('title')}</h1>
      <p className="mb-8 text-sm text-[#666666]">{t('subtitle')}</p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error || t('genericError')}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <div className={sectionLabelClass}>{t('sectionAbout')}</div>
          <div className="space-y-4">
            <div>
              <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                {t('orgName')}
              </label>
              <div className="relative">
                <BuildingIcon className={iconWrapClass} />
                <input
                  id="nom"
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">{t('specialtyLabel')}</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEspecialidad('estetica_dermato')}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors ${
                    especialidad === 'estetica_dermato'
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#5b21b6]'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <SparkleIcon className="h-5 w-5" />
                  {t('specialtyEstetica')}
                </button>
                <button
                  type="button"
                  onClick={() => setEspecialidad('clinica_medica')}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors ${
                    especialidad === 'clinica_medica'
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#5b21b6]'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <StethoscopeIcon className="h-5 w-5" />
                  {t('specialtyClinica')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className={sectionLabelClass}>{t('sectionAccess')}</div>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                {t('email')}
              </label>
              <div className="relative">
                <MailIcon className={iconWrapClass} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a1a1a]">
                {t('password')}
              </label>
              <div className="relative">
                <LockIcon className={iconWrapClass} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#666666]"
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>
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
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-[#7C3AED] hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  )
}
