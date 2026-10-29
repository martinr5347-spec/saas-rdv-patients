import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

export const SUPPORTED_LOCALES = ['es', 'pt', 'fr'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupported(value: string | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

// Routing next-intl "sans prefixe d'URL" (pas de segment [locale]) -- la locale est resolue par
// requete, jamais dans le chemin. Ordre de resolution :
// 1. Cookie NEXT_LOCALE (choix explicite du visiteur/praticien, pose par setLocaleCookie côté client)
// 2. Compte authentifie : users.idioma (es/pt uniquement, jamais 'fr' -- ce champ pilote aussi
//    organizations.langue/les templates patients, qui n'existent qu'en es/pt) -- preserve a
//    l'identique le comportement actuel d'un praticien deja en ES/PT tant qu'il n'a jamais
//    choisi explicitement une autre langue d'interface via le cookie.
// 3. Defaut 'es' (meme defaut que l'ancien hook lib/hooks/useLocale.ts).
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value

  let locale: SupportedLocale
  if (isSupported(cookieLocale)) {
    locale = cookieLocale
  } else {
    let bootstrapLocale: SupportedLocale | null = null
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('idioma').eq('id', user.id).maybeSingle()
        if (profile?.idioma === 'pt') bootstrapLocale = 'pt'
        else if (profile?.idioma === 'es') bootstrapLocale = 'es'
      }
    } catch {
      // Pages publiques sans session, ou erreur reseau -- retombe sur le defaut ci-dessous.
    }
    locale = bootstrapLocale ?? 'es'
  }

  const messages = (await import(`../messages/${locale}.json`)).default

  return { locale, messages }
})
