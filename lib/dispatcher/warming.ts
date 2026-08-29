// Unipile connecte WhatsApp comme une session WhatsApp Web (pas l'API Business officielle Meta) :
// un numéro qui envoie trop de messages trop vite dès sa connexion se fait bannir par les
// systèmes anti-abus de WhatsApp. On applique donc une montée en charge progressive par cabinet,
// à partir de la date de connexion du compte Unipile (org_settings.unipile_connected_at).

const WARMING_SCHEDULE: { afterDays: number; dailyLimit: number }[] = [
  { afterDays: 0, dailyLimit: 5 },
  { afterDays: 3, dailyLimit: 10 },
  { afterDays: 7, dailyLimit: 20 },
  { afterDays: 15, dailyLimit: 40 },
  { afterDays: 22, dailyLimit: 80 },
]

// Délai minimum entre deux messages sur un même numéro, pour éviter un pattern d'envoi robotique.
export const MIN_SECONDS_BETWEEN_MESSAGES = 15

export function getDailyLimit(connectedAt: string | null, now: Date = new Date()): number {
  if (!connectedAt) return WARMING_SCHEDULE[0].dailyLimit

  const daysSinceConnection = Math.floor((now.getTime() - new Date(connectedAt).getTime()) / (24 * 60 * 60 * 1000))

  let limit = WARMING_SCHEDULE[0].dailyLimit
  for (const step of WARMING_SCHEDULE) {
    if (daysSinceConnection >= step.afterDays) limit = step.dailyLimit
  }
  return limit
}

export function startOfTodayIso(now: Date = new Date()): string {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  return start.toISOString()
}

// Un numéro Unipile différent du précédent redémarre la chauffe depuis le début.
// Un numéro retiré efface la date (repart de zéro s'il est reconnecté plus tard).
export function resolveUnipileConnectedAt(
  previousAccountId: string | null,
  nextAccountId: string | null | undefined,
  previousConnectedAt: string | null
): string | null {
  const next = nextAccountId?.trim() || null
  if (!next) return null
  if (next !== previousAccountId) return new Date().toISOString()
  return previousConnectedAt
}
