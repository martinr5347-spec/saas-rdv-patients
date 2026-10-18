'use client'

import { useTranslations } from 'next-intl'

// Jours/mois codes en dur, comme DIAS_CORTOS/MESES dans ReservaView.tsx -- simple vocabulaire de
// calendrier, pas une phrase a traduire via next-intl.
const DIAS_CORTOS: Record<'es' | 'pt', string[]> = {
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
  pt: ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá', 'Do'],
}

const DIAS_NUM = [10, 11, 12, 13, 14, 15, 16]
const DIAS_DISPONIBLES = [1, 3, 4] // index dans DIAS_NUM
const DIA_SELECCIONADO = 3

const SLOTS = ['09:00', '10:30', '15:00']

export default function PilarReserva({ locale }: { locale: 'es' | 'pt' }) {
  const t = useTranslations('home')

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row-reverse md:items-center md:gap-12">
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-xl font-semibold text-[#1a1a1a]">{t('pilar2Title')}</h3>
        <p className="mt-2 text-gray-600">{t('pilar2Desc')}</p>
      </div>
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-xl shadow-black/10">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-400">
            {DIAS_CORTOS[locale].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {DIAS_NUM.map((dia, i) => {
              const seleccionado = i === DIA_SELECCIONADO
              const disponible = DIAS_DISPONIBLES.includes(i)
              return (
                <span
                  key={dia}
                  className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium ${
                    seleccionado
                      ? 'bg-[#6926D2] text-white'
                      : disponible
                      ? 'bg-violet-50 text-[#6926D2]'
                      : 'text-gray-300'
                  }`}
                >
                  {dia}
                </span>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">{t('pilar2SlotsCaption')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SLOTS.map((hora, i) => (
              <span
                key={hora}
                className={`rounded-lg border py-1.5 text-center text-xs font-medium ${
                  i === 1 ? 'border-[#6926D2] text-[#6926D2]' : 'border-gray-200 text-gray-700'
                }`}
              >
                {hora}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
