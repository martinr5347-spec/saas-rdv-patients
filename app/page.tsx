'use client'

import Link from 'next/link'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { useLocale, MESSAGES } from '@/lib/hooks/useLocale'

export default function HomePage() {
  const { locale, setLocale } = useLocale()

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <HomeContent locale={locale} setLocale={setLocale} />
    </NextIntlClientProvider>
  )
}

function HomeContent({
  locale,
  setLocale,
}: {
  locale: 'es' | 'pt'
  setLocale: (l: 'es' | 'pt') => void
}) {
  const t = useTranslations('home')
  const tRoot = useTranslations()

  return (
    <div className="min-h-screen bg-[#0A1422]">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
              {tRoot('tagline')}
            </div>
            <span className="font-semibold text-lg text-white">Núcleo</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocale('es')}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  locale === 'es'
                    ? 'border-[#6926D2] bg-[#6926D2]/20 text-white'
                    : 'border-white/20 text-gray-400 hover:border-white/40'
                }`}
              >
                <span>🇪🇸</span> Español
              </button>
              <button
                type="button"
                onClick={() => setLocale('pt')}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  locale === 'pt'
                    ? 'border-[#6926D2] bg-[#6926D2]/20 text-white'
                    : 'border-white/20 text-gray-400 hover:border-white/40'
                }`}
              >
                <span>🇧🇷</span> Português
              </button>
            </div>
            <Link href="/login" className="text-sm text-gray-300 hover:text-white">{t('navLogin')}</Link>
            <Link href="/register" className="text-sm rounded-md bg-[#6926D2] px-3 py-1.5 text-white hover:bg-[#5a20b3]">{t('navRegister')}</Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {t('heroTitle')}
        </h1>
        <p className="text-lg text-gray-300">
          {t('heroSubtitle')}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register" className="rounded-md bg-[#6926D2] px-6 py-3 text-white font-medium hover:bg-[#5a20b3]">
            {t('ctaPrimary')}
          </Link>
          <Link href="/login" className="rounded-md border border-white/20 bg-transparent px-6 py-3 text-white font-medium hover:bg-white/5">
            {t('navLogin')}
          </Link>
        </div>
      </main>

      <section className="bg-[#F5F0E8]">
        <div className="max-w-4xl mx-auto px-4 py-16 grid gap-8 sm:grid-cols-3 text-center">
          <div>
            <div className="mx-auto mb-3 h-2 w-2 rounded-full bg-[#6926D2]" />
            <h3 className="font-semibold text-[#1a1a1a]">{t('feature1Title')}</h3>
            <p className="mt-1 text-sm text-[#666666]">{t('feature1Desc')}</p>
          </div>
          <div>
            <div className="mx-auto mb-3 h-2 w-2 rounded-full bg-[#6926D2]" />
            <h3 className="font-semibold text-[#1a1a1a]">{t('feature2Title')}</h3>
            <p className="mt-1 text-sm text-[#666666]">{t('feature2Desc')}</p>
          </div>
          <div>
            <div className="mx-auto mb-3 h-2 w-2 rounded-full bg-[#6926D2]" />
            <h3 className="font-semibold text-[#1a1a1a]">{t('feature3Title')}</h3>
            <p className="mt-1 text-sm text-[#666666]">{t('feature3Desc')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
