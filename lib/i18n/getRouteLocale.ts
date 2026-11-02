import { cookies } from 'next/headers'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/request'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'
import frMessages from '@/messages/fr.json'

// Pour les routes API (route handlers) qui renvoient des messages d'erreur affiches directement a
// l'ecran, hors du contexte React ou useTranslations est utilisable -- lit le meme cookie
// NEXT_LOCALE que i18n/request.ts, sans le bootstrap depuis users.idioma (routes dashboard
// uniquement, jamais utilisees sur des pages publiques sans session ou le cookie ne serait pas pose).
export function getRouteLocale(): SupportedLocale {
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as SupportedLocale
  }
  return 'es'
}

const MESSAGES_BY_LOCALE: Record<SupportedLocale, typeof esMessages> = {
  es: esMessages,
  pt: ptMessages,
  fr: frMessages,
}

export function getRouteMessages() {
  return MESSAGES_BY_LOCALE[getRouteLocale()]
}
