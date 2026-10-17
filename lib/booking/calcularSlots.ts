export interface FranjaDisponibilidad {
  diaSemana: number // 0=dimanche..6=samedi (Date.getDay())
  horaInicio: string // 'HH:mm'
  horaFin: string
}

export interface FechaBloqueada {
  fecha: string // 'YYYY-MM-DD'
}

export interface CitaExistente {
  fecha: string
  horaInicio: string
  horaFin: string | null // null -> repli 30 min, meme convention que AppointmentsCalendarView.tsx
}

export interface ParametrosReserva {
  duracionCitaMin: number
  bufferMin: number
  anticipacionMinHoras: number
  anticipacionMaxDias: number
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function aHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Jour de la semaine a partir d'une date 'YYYY-MM-DD', calcule en UTC explicitement -- new
// Date(`${fecha}T00:00:00`).getDay() dependrait du fuseau LOCAL du processus Node qui execute
// ce code (pas celui de l'organisation), ce qui peut decaler le jour d'une unite selon
// l'environnement d'execution. Date.UTC() + getUTCDay() est deterministe quel que soit le fuseau serveur.
function diaSemanaDeFecha(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Calcule les creneaux disponibles pour UNE date donnee.
 * `ahoraLocal` = { fecha: 'YYYY-MM-DD', minutosDesdeMedianoche: number } dans le fuseau de l'organisation,
 * a calculer par l'appelant via Intl.DateTimeFormat (voir section API).
 */
export function calcularSlotsDelDia(
  fecha: string,
  franjas: FranjaDisponibilidad[],
  fechasBloqueadas: FechaBloqueada[],
  citasExistentes: CitaExistente[],
  parametros: ParametrosReserva,
  ahoraLocal: { fecha: string; minutosDesdeMedianoche: number }
): string[] {
  if (fechasBloqueadas.some((b) => b.fecha === fecha)) return []

  // Fonction pure et autosuffisante : une date passee ne doit jamais renvoyer de creneau,
  // meme si l'appelant (route API) filtre deja ce cas en amont -- ne pas dependre de ca.
  if (fecha < ahoraLocal.fecha) return []

  const diaSemana = diaSemanaDeFecha(fecha)
  const franjasDelDia = franjas.filter((f) => f.diaSemana === diaSemana)
  if (franjasDelDia.length === 0) return []

  // Fenetre d'anticipation minimale : ne s'applique qu'au jour meme (un jour futur n'est jamais
  // concerne, un jour passe est deja exclu ci-dessus).
  const limiteMinHoy = ahoraLocal.minutosDesdeMedianoche + parametros.anticipacionMinHoras * 60

  const ocupados = citasExistentes
    .filter((c) => c.fecha === fecha)
    .map((c) => ({
      inicio: aMinutos(c.horaInicio),
      fin: c.horaFin ? aMinutos(c.horaFin) : aMinutos(c.horaInicio) + 30,
    }))

  const slots: string[] = []
  const paso = parametros.duracionCitaMin + parametros.bufferMin

  for (const franja of franjasDelDia) {
    let t = aMinutos(franja.horaInicio)
    const finFranja = aMinutos(franja.horaFin)

    while (t + parametros.duracionCitaMin <= finFranja) {
      const finSlot = t + parametros.duracionCitaMin
      const chevaucheOcupado = ocupados.some((o) => t < o.fin && finSlot > o.inicio)
      const dentroAnticipacionMin = fecha !== ahoraLocal.fecha || t >= limiteMinHoy

      if (!chevaucheOcupado && dentroAnticipacionMin) {
        slots.push(aHHMM(t))
      }
      t += paso
    }
  }

  return slots.sort()
}
