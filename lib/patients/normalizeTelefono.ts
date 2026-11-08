export function normalizeTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '')
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
