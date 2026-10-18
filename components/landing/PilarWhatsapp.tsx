'use client'

import { useTranslations } from 'next-intl'
import WhatsappSequence from './WhatsappSequence'

export default function PilarWhatsapp() {
  const t = useTranslations('home')

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-xl font-semibold text-[#1a1a1a]">{t('pilar1Title')}</h3>
        <p className="mt-2 text-gray-600">{t('pilar1Desc')}</p>
      </div>
      <div className="flex flex-1 justify-center">
        <WhatsappSequence />
      </div>
    </div>
  )
}
