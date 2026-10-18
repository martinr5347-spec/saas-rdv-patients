'use client'

import Link from 'next/link'
import Image from 'next/image'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { useLocale, MESSAGES } from '@/lib/hooks/useLocale'
import WhatsappSequence from '@/components/landing/WhatsappSequence'
import PilarWhatsapp from '@/components/landing/PilarWhatsapp'
import PilarReserva from '@/components/landing/PilarReserva'
import PilarIngresos from '@/components/landing/PilarIngresos'
import PilarFichaPaciente from '@/components/landing/PilarFichaPaciente'

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

  return (
    <div className="min-h-screen bg-[#0A1422]">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/nucleo-icon-inverse.png" alt="Núcleo" width={28} height={28} />
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

      <main className="max-w-6xl mx-auto px-4 py-16 sm:py-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        {/* Colonne texte */}
        <div className="text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/90">
            {t('badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-4xl xl:text-5xl">
            {t('heroTitlePre')} <span className="text-[#A472F0]">{t('heroTitleHighlight')}</span> {t('heroTitlePost')}
          </h1>
          <p className="text-lg text-gray-300">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
            <Link href="/register" className="rounded-md bg-[#6926D2] px-6 py-3 text-white font-medium hover:bg-[#5a20b3]">
              {t('ctaPrimary')}
            </Link>
            <Link href="/login" className="rounded-md border border-white/20 bg-transparent px-6 py-3 text-white font-medium hover:bg-white/5">
              {t('navLogin')}
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-white/90">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6926D2]" />
              {t('featureBubble1')}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-white/90">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6926D2]" />
              {t('featureBubble2')}
            </div>
          </div>
        </div>

        {/* Colonne illustration — empilement vertical pur (aucun `absolute`), pour un
            chevauchement structurellement impossible entre les cartes et le cadre. */}
        <div className="mt-16 flex flex-col items-center gap-5 lg:mt-0">
          <div className="w-56 -rotate-2 rounded-2xl bg-[#F5F0E8] p-4 text-left shadow-2xl shadow-black/50 sm:w-64">
            <div className="flex items-center gap-2 text-sm font-medium text-[#6926D2]">
              <span>📅</span>
              <span>{t('previewLabel')}</span>
            </div>
            <div className="mt-2">
              <p className="text-base font-semibold text-[#1a1a1a]">{t('previewName')}</p>
              <p className="text-xs text-[#666666]">{t('previewDate')}</p>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-2">
              <span className="h-2 w-2 rounded-full bg-[#6926D2]" />
              <span className="text-xs font-medium text-[#1a1a1a]">{t('previewStatus')}</span>
            </div>
          </div>

          <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50 sm:max-w-xs">
            <Image
              src="/images/hero-characters.png"
              alt="Praticiens Núcleo"
              fill
              className="object-cover"
            />
          </div>

          <div className="rotate-2">
            <WhatsappSequence compact />
          </div>
        </div>
      </main>

      <section className="bg-[#F5F0E8]">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-center text-2xl font-bold text-[#1a1a1a] sm:text-3xl">{t('pilaresTitle')}</h2>
          <div className="mt-12 space-y-16 divide-y divide-black/5">
            <PilarWhatsapp />
            <div className="pt-16">
              <PilarReserva locale={locale} />
            </div>
            <div className="pt-16">
              <PilarIngresos />
            </div>
            <div className="pt-16">
              <PilarFichaPaciente locale={locale} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
