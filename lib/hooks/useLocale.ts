'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale as useNextIntlLocale } from 'next-intl'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'
import frMessages from '@/messages/fr.json'
import { setLocaleCookie } from '@/lib/i18n/setLocaleCookie'
import type { SupportedLocale } from '@/i18n/request'

// Routing next-intl officiel (i18n/request.ts) remplace desormais la lecture localStorage directe
// -- ce hook garde la MEME signature { locale, setLocale } que l'ancienne version pour ne pas avoir
// a toucher chaque page publique qui l'appelle, mais lit/ecrit la locale via le cookie NEXT_LOCALE
// (resolu cote serveur a chaque requete) plutot qu'un useState+localStorage purement client.
export type Locale = SupportedLocale
export const MESSAGES: Record<Locale, typeof esMessages> = { es: esMessages, pt: ptMessages, fr: frMessages }

export function useLocale() {
  const locale = useNextIntlLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function setLocale(next: Locale) {
    startTransition(async () => {
      await setLocaleCookie(next)
      router.refresh()
    })
  }

  return { locale, setLocale, isPending }
}
