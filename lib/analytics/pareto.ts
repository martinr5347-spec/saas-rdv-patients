export interface ActoRealizadoRow {
  monto: number
  fecha: string
  nombre: string
}

export interface ParetoGroup {
  nombre: string
  monto: number
  cantidad: number
}

// Vrai groupby de actos_realizados -- rien de simule. Groupe par nom resolu (acto.nombre ou
// acto_texto_libre, deja fusionnes cote serveur) plutot que par acto_id, pour que deux entrees
// "solo esta vez" avec le meme libelle se cumulent naturellement comme un seul acte dans l'insight.
// Extrait de AnalisisView.tsx pour etre reutilise tel quel par le widget compact de Citas.
export function groupActos(actos: ActoRealizadoRow[]): ParetoGroup[] {
  const map = new Map<string, ParetoGroup>()
  for (const a of actos) {
    const key = a.nombre || '—'
    const existing = map.get(key)
    if (existing) {
      existing.monto += Number(a.monto)
      existing.cantidad += 1
    } else {
      map.set(key, { nombre: key, monto: Number(a.monto), cantidad: 1 })
    }
  }
  return Array.from(map.values())
}

export interface ParetoInsight {
  porMonto: ParetoGroup[]
  porCantidad: ParetoGroup[]
  totalMonto: number
  actosPara80: number
}

// Groupes tries par montant/quantite + nombre d'actes representant >=80% du chiffre d'affaires
// (seuil Pareto 80/20). Meme calcul que l'ancien ParetoInsightCard local a AnalisisView.tsx.
export function computeParetoInsight(actos: ActoRealizadoRow[]): ParetoInsight {
  const groups = groupActos(actos)
  const porMonto = [...groups].sort((a, b) => b.monto - a.monto)
  const porCantidad = [...groups].sort((a, b) => b.cantidad - a.cantidad)
  const totalMonto = porMonto.reduce((s, g) => s + g.monto, 0)

  let acumulado = 0
  let actosPara80 = 0
  for (const g of porMonto) {
    acumulado += g.monto
    actosPara80 += 1
    if (totalMonto > 0 && acumulado / totalMonto >= 0.8) break
  }

  return { porMonto, porCantidad, totalMonto, actosPara80 }
}
