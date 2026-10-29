'use client'

import { useTranslations } from 'next-intl'

const CITAS_EJEMPLO: Record<'es' | 'pt' | 'fr', { fecha: string }[]> = {
  es: [{ fecha: '12 feb' }, { fecha: '03 ene' }],
  pt: [{ fecha: '12 fev' }, { fecha: '03 jan' }],
  fr: [{ fecha: '12 fév' }, { fecha: '03 jan' }],
}

export default function PilarFichaPaciente({ locale }: { locale: 'es' | 'pt' | 'fr' }) {
  const t = useTranslations('home')
  const nombre = t('previewName')
  const iniciales = nombre
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row-reverse md:items-center md:gap-12">
      <div className="flex-1 text-center md:text-left">
        <h3 className="text-xl font-semibold text-[#1a1a1a]">{t('pilar4Title')}</h3>
        <p className="mt-2 text-gray-600">{t('pilar4Desc')}</p>
      </div>
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-xl shadow-black/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-[#6926D2]">
              {iniciales}
            </span>
            <p className="text-sm font-semibold text-[#1a1a1a]">{nombre}</p>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-600">{CITAS_EJEMPLO[locale][0].fecha}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                {t('pilar4Status1')}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-600">{CITAS_EJEMPLO[locale][1].fecha}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                {t('pilar4Status2')}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-amber-50 p-2.5">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              {t('pilar4NoteCategoria')}
            </span>
            <p className="mt-1.5 text-xs text-gray-700">{t('pilar4NoteSnippet')}</p>
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-400">🔒 {t('pilar4LockCaption')}</p>
        </div>
      </div>
    </div>
  )
}
