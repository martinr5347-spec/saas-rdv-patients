import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/request'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'
import frMessages from '@/messages/fr.json'

// Pour les routes API (route handlers) qui renvoient des messages d'erreur affiches directement a
// l'ecran, hors du contexte React ou useTranslations est utilisable -- meme ordre de priorite que
// i18n/request.ts (cf. prompt langue-verrouillee-sur-pais) : la langue du compte authentifie prime
// TOUJOURS sur le cookie NEXT_LOCALE, qui ne sert plus que faute de compte dont la deriver.
export async function getRouteLocale(): Promise<SupportedLocale> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('idioma').eq('id', user.id).maybeSingle()
      if (profile?.idioma === 'pt') return 'pt'
      if (profile?.idioma === 'es') return 'es'
    }
  } catch {
    // Pas de session, ou erreur reseau -- retombe sur le cookie puis le defaut ci-dessous.
  }

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

export async function getRouteMessages() {
  return MESSAGES_BY_LOCALE[await getRouteLocale()]
}
