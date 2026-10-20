import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'

// Verification centralisee du PIN des notas clinicas, partagee par toutes les routes qui le
// demandent (notes, photos, alerte) -- ne jamais dupliquer cette fonction dans une route : la
// limite de tentatives ci-dessous ne protege contre le brute-force que si c'est le seul chemin
// possible pour comparer le code soumis au hash stocke.
const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15

export type VerifyCodigoResult =
  | { ok: true; reason: null; status: 200 }
  | { ok: false; reason: string; status: 400 | 403 | 429 }

export async function verifyCodigo(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  codigo: string
): Promise<VerifyCodigoResult> {
  const { data: userRow } = await supabase
    .from('users')
    .select('codigo_seguridad_hash, codigo_intentos_fallidos, codigo_bloqueado_hasta')
    .eq('id', userId)
    .single()

  if (!userRow?.codigo_seguridad_hash) {
    return { ok: false, reason: 'Código de seguridad no configurado. Configúralo en Configuración.', status: 400 }
  }

  if (userRow.codigo_bloqueado_hasta && new Date(userRow.codigo_bloqueado_hasta).getTime() > Date.now()) {
    const minutosRestantes = Math.ceil((new Date(userRow.codigo_bloqueado_hasta).getTime() - Date.now()) / 60000)
    return {
      ok: false,
      reason: `Demasiados intentos incorrectos. Vuelve a intentarlo en ${minutosRestantes} min.`,
      status: 429,
    }
  }

  const match = await bcrypt.compare(codigo, userRow.codigo_seguridad_hash)

  if (match) {
    // N'ecrit que si un reset est reellement necessaire -- evite une ecriture DB a chaque succes.
    if ((userRow.codigo_intentos_fallidos ?? 0) > 0 || userRow.codigo_bloqueado_hasta) {
      await supabase.from('users').update({ codigo_intentos_fallidos: 0, codigo_bloqueado_hasta: null }).eq('id', userId)
    }
    return { ok: true, reason: null, status: 200 }
  }

  // La tentative qui fait franchir le seuil reste elle-meme un "code incorrect" normal (403) --
  // c'est l'appel SUIVANT qui trouvera le verrou deja pose (check en haut de fonction) et
  // recevra 429. Comportement attendu : 5 echecs individuels, 6e appel bloque.
  const intentos = (userRow.codigo_intentos_fallidos ?? 0) + 1
  if (intentos >= MAX_INTENTOS) {
    const bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString()
    await supabase.from('users').update({ codigo_intentos_fallidos: 0, codigo_bloqueado_hasta: bloqueadoHasta }).eq('id', userId)
  } else {
    await supabase.from('users').update({ codigo_intentos_fallidos: intentos }).eq('id', userId)
  }
  return { ok: false, reason: 'Código incorrecto', status: 403 }
}
