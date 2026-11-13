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
// 1. Compte authentifie : users.idioma (es/pt uniquement, jamais 'fr') prime TOUJOURS, jamais le
//    cookie -- le pays du cabinet est la seule source de verite (cf. prompt
//    langue-verrouillee-sur-pais) : un cookie NEXT_LOCALE herite d'une autre session dans le meme
//    navigateur ne doit jamais pouvoir ecraser la langue du compte.
// 2. Visiteur non authentifie (pages publiques : accueil, login, register) : cookie NEXT_LOCALE,
//    choix explicite pose par setLocaleCookie cote client -- seul cas ou il s'applique encore,
//    faute de compte dont deriver la langue.
// 3. Defaut 'es' (meme defaut que l'ancien hook lib/hooks/useLocale.ts).
export default getRequestConfig(async () => {
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
    // Pages publiques sans session, ou erreur reseau.
  }

  let locale: SupportedLocale
  if (bootstrapLocale) {
    locale = bootstrapLocale
  } else {
    const cookieLocale = cookies().get('NEXT_LOCALE')?.value
    locale = isSupported(cookieLocale) ? cookieLocale : 'es'
  }

  const messages = (await import(`../messages/${locale}.json`)).default

  return { locale, messages }
})
