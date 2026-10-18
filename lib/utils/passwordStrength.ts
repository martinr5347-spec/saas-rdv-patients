// Regle de mot de passe partagee client/serveur -- ne jamais dupliquer cette logique,
// la route d'inscription doit rejeter exactement ce que le formulaire rejette.
export type PasswordStrength = 'faible' | 'moyenne' | 'forte'

const MIN_LENGTH = 8
const BONUS_LENGTH = 12
const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/

// Regle minimale obligatoire : 8+ caracteres, au moins 1 majuscule, au moins 1 chiffre.
// Pas de caractere special exige -- complexite raisonnable, cf. decision produit.
export function meetsMinimumPasswordRule(password: string): boolean {
  return password.length >= MIN_LENGTH && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!meetsMinimumPasswordRule(password)) return 'faible'
  const hasBonus = password.length >= BONUS_LENGTH || SPECIAL_CHAR_RE.test(password)
  return hasBonus ? 'forte' : 'moyenne'
}
