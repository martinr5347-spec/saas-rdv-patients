import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Chiffrement symetrique des secrets sensibles stockes en base (ex. org_settings.mp_access_token).
// AES-256-GCM via node:crypto natif -- pas de nouvelle dependance npm. Toutes les routes qui
// importent ce module tournent en runtime Node (pas Edge), confirme par l'absence de
// `export const runtime = 'edge'` dans le repo.

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // taille standard recommandee pour GCM

function loadKey(): Buffer {
  const keyB64 = process.env.SETTINGS_ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY manquante. Generer une cle avec `openssl rand -base64 32` et la definir dans les variables d'environnement avant de demarrer l'application."
    )
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY invalide : doit decoder en exactement 32 bytes (openssl rand -base64 32).')
  }
  return key
}

// Chargee et validee des le premier import de ce module -- pas seulement au premier appel de
// encryptSecret/decryptSecret -- pour qu'une cle absente ou invalide fasse echouer bruyamment et
// immediatement les routes concernees, plutot que de echouer silencieusement plus tard (ex. au
// premier RDV paye).
const KEY = loadKey()

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Format de secret chiffré invalide')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
