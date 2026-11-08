export function normalizeTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '')
}

// Meme seuil que app/api/public/reservar/[slug]/route.ts (telefonoNumero.replace(/\D/g, '').length
// < 6) -- repris ici a l'identique pour rester coherent, pas un nouveau seuil invente. En dessous,
// telefonosCoinciden() comparerait sur une longueur trop courte pour etre fiable (un numero de 2-3
// chiffres matcherait a tort la fin de n'importe quel numero existant).
export const TELEFONO_MIN_DIGITOS = 6

export function telefonoTieneLongitudMinima(telefono: string): boolean {
  return normalizeTelefono(telefono).length >= TELEFONO_MIN_DIGITOS
}

// Compare deux telefonos en ignorant la mise en forme (espaces/tirets/parentheses/+/points) et un
// eventuel indicatif pays devant le numero local : on ne compare que les 8 derniers chiffres de
// chaque numero normalise (ou sa longueur totale si un numero en a moins de 8) -- jamais la
// chaine brute. Utilisee UNIQUEMENT pour la detection de doublons ; la valeur telefono stockee en
// base n'est jamais reecrite a partir de ceci.
export function telefonosCoinciden(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const na = normalizeTelefono(a)
  const nb = normalizeTelefono(b)
  if (!na || !nb) return false
  const len = Math.min(8, na.length, nb.length)
  return na.slice(-len) === nb.slice(-len)
}
