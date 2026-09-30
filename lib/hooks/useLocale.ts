'use client'

import { useEffect, useState } from 'react'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

export type Locale = 'es' | 'pt'
export const MESSAGES: Record<Locale, typeof esMessages> = { es: esMessages, pt: ptMessages }

const STORAGE_KEY = 'nucleo_locale'

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('es')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'es' || stored === 'pt') setLocaleState(stored)
    } catch {}
  }, [])

  function setLocale(next: Locale) {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  return { locale, setLocale }
}
