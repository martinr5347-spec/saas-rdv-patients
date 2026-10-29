'use server'

import { cookies } from 'next/headers'
import type { SupportedLocale } from '@/i18n/request'

// 1 an, meme duree que les cookies de preference habituels -- le choix explicite d'un visiteur
// ou praticien doit survivre longtemps, pas juste la session.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export async function setLocaleCookie(locale: SupportedLocale) {
  cookies().set('NEXT_LOCALE', locale, { maxAge: MAX_AGE_SECONDS, path: '/', sameSite: 'lax' })
}
