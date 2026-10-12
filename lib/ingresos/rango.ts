export interface Rango {
  desdeAno: number
  desdeMes: number
  hastaAno: number
  hastaMes: number
}

function parseOne(v: string | undefined | null, fallbackAno: number, fallbackMes: number) {
  if (v && /^\d{4}-\d{2}$/.test(v)) {
    const [a, m] = v.split('-')
    return { ano: Number(a), mes: Number(m) }
  }
  return { ano: fallbackAno, mes: fallbackMes }
}

/**
 * Parse desde/hasta (YYYY-MM) en une plage de mois, bornes incluses.
 * Defaut sur le mois en cours si absents. Inverse desde/hasta si besoin,
 * et tronque a 12 mois maximum.
 */
export function parseRango(desde: string | undefined | null, hasta: string | undefined | null): Rango {
  const now = new Date()
  const defaultAno = now.getUTCFullYear()
  const defaultMes = now.getUTCMonth() + 1

  const d = parseOne(desde, defaultAno, defaultMes)
  const h = parseOne(hasta, d.ano, d.mes)

  let desdeAno = d.ano
  let desdeMes = d.mes
  let hastaAno = h.ano
  let hastaMes = h.mes

  if (desdeAno > hastaAno || (desdeAno === hastaAno && desdeMes > hastaMes)) {
    ;[desdeAno, hastaAno] = [hastaAno, desdeAno]
    ;[desdeMes, hastaMes] = [hastaMes, desdeMes]
  }

  const totalMonths = (hastaAno - desdeAno) * 12 + (hastaMes - desdeMes) + 1
  if (totalMonths > 12) {
    const truncated = new Date(Date.UTC(desdeAno, desdeMes - 1 + 11, 1))
    hastaAno = truncated.getUTCFullYear()
    hastaMes = truncated.getUTCMonth() + 1
  }

  return { desdeAno, desdeMes, hastaAno, hastaMes }
}

export function rangeSpan(desdeAno: number, desdeMes: number, hastaAno: number, hastaMes: number) {
  const start = new Date(Date.UTC(desdeAno, desdeMes - 1, 1))
  const end = new Date(Date.UTC(hastaAno, hastaMes, 1)) // debut du mois suivant "hasta"
  return { start, end, startStr: start.toISOString().slice(0, 10), endStr: end.toISOString().slice(0, 10) }
}

export function formatPeriodo(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}
