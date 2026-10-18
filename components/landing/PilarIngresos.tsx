'use client'

import { useTranslations } from 'next-intl'

// Hauteurs statiques (%) pour 4 barres de mois -- mockup decoratif, pas de donnees reelles.
// La derniere barre (mois en cours) reprend l'accent violet, les precedentes le gris utilise
// pour l'annee precedente dans AnalisisView.tsx -- meme code couleur que le vrai dashboard.
const BARRAS = [40, 65, 55, 85]

export default function PilarIngresos() {
  const t = useTranslations('home')

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-xl font-semibold text-[#1a1a1a]">{t('pilar3Title')}</h3>
        <p className="mt-2 text-gray-600">{t('pilar3Desc')}</p>
      </div>
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-xl shadow-black/10">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('pilar3Kpi1Label')}</p>
              <p className="text-lg font-semibold text-[#1a1a1a]">+24%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('pilar3Kpi2Label')}</p>
              <p className="text-lg font-semibold text-[#1a1a1a]">92%</p>
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold text-gray-700">{t('pilar3ChartTitle')}</p>
          <div className="mt-2 flex h-20 items-end gap-2">
            {BARRAS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${i === BARRAS.length - 1 ? 'bg-[#6926D2]' : 'bg-[#d3d1c7]'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
