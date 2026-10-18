'use client'

import { useTranslations } from 'next-intl'

export default function WhatsappSequence({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('home')

  return (
    <div className={`rounded-xl bg-white text-left shadow-xl shadow-black/40 ${compact ? 'w-56 p-4 sm:w-64' : 'w-full max-w-xs p-5'}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366]">
        <span>💬</span>
        <span>{t('whatsappSent')}</span>
        <span>✓</span>
      </div>
      <div className={`mt-2 space-y-1.5 ${compact ? '' : 'space-y-2'}`}>
        <p className="rounded-lg bg-[#F5F0E8] px-3 py-2 text-xs text-[#1a1a1a]">{t('heroWaMsg1')}</p>
        <p className="ml-6 rounded-lg bg-[#6926D2]/10 px-3 py-2 text-xs italic text-[#1a1a1a]">
          &ldquo;{t('whatsappQuote')}&rdquo;
        </p>
        <p className="rounded-lg bg-[#F5F0E8] px-3 py-2 text-xs text-[#1a1a1a]">{t('heroWaMsg3')}</p>
      </div>
    </div>
  )
}
