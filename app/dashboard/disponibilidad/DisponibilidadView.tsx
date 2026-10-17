'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help text-gray-400">
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 text-[9px]">i</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-gray-800 px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  )
}

const DIAS_SEMANA = [
  { valor: 1, label: 'Lunes' },
  { valor: 2, label: 'Martes' },
  { valor: 3, label: 'Miércoles' },
  { valor: 4, label: 'Jueves' },
  { valor: 5, label: 'Viernes' },
  { valor: 6, label: 'Sábado' },
  { valor: 0, label: 'Domingo' },
]

interface AvailabilityRow {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

interface Plage {
  horaInicio: string
  horaFin: string
}

interface DiaHorario {
  diaSemana: number
  abierto: boolean
  plages: Plage[]
}

// Limite raisonnable cote UI pour eviter un abus (pas de plafond fonctionnel reel -- le schema et
// calcularSlotsDelDia supportent deja un nombre quelconque de plages par jour). Dupliquee cote
// serveur dans actions.ts, qui ne doit jamais faire confiance a cette seule limite client.
const MAX_PLAGES_POR_DIA = 5

function plagesSeSuperponen(a: Plage, b: Plage): boolean {
  return a.horaInicio < b.horaFin && b.horaInicio < a.horaFin
}

// Validation client avant sauvegarde, pour un retour immediat -- revalidee cote serveur dans
// actions.ts (ne jamais faire confiance au seul controle client).
function validarHorarios(horarios: DiaHorario[]): string | null {
  for (const dia of horarios) {
    if (!dia.abierto) continue
    const label = DIAS_SEMANA.find((d) => d.valor === dia.diaSemana)?.label ?? ''
    for (const p of dia.plages) {
      if (!(p.horaFin > p.horaInicio)) {
        return `${label}: la hora de fin debe ser posterior a la de inicio`
      }
    }
    for (let i = 0; i < dia.plages.length; i++) {
      for (let j = i + 1; j < dia.plages.length; j++) {
        if (plagesSeSuperponen(dia.plages[i], dia.plages[j])) {
          return `${label}: hay horarios que se superponen`
        }
      }
    }
  }
  return null
}

interface BlockedDateRow {
  id: string
  fecha: string
  motivo: string | null
}

export default function DisponibilidadView({
  organizationSlug,
  availability,
  blockedDates,
  duracionCitaMin,
  bufferMin,
  anticipacionMinHoras,
  anticipacionMaxDias,
  updateDisponibilidadAction,
  updateSlugAction,
  addBlockedDateAction,
  removeBlockedDateAction,
}: {
  organizationSlug: string | null
  availability: AvailabilityRow[]
  blockedDates: BlockedDateRow[]
  duracionCitaMin: number
  bufferMin: number
  anticipacionMinHoras: number
  anticipacionMaxDias: number
  updateDisponibilidadAction: typeof import('./actions').updateDisponibilidad
  updateSlugAction: typeof import('./actions').updateSlug
  addBlockedDateAction: typeof import('./actions').addBlockedDate
  removeBlockedDateAction: typeof import('./actions').removeBlockedDate
}) {
  // État local : un toggle "abierto" + une ou plusieurs plages (horaInicio/horaFin) par jour,
  // pré-rempli depuis availability -- toutes les lignes du jour, pas juste la première (une
  // pause déjeuner, par ex., se traduit par 2 lignes org_availability pour le même dia_semana).
  // Valeur par défaut raisonnable si le jour n'a pas encore de ligne : fermé, une plage 09:00-18:00
  // prête au cas où il est activé.
  const [horarios, setHorarios] = useState<DiaHorario[]>(() =>
    DIAS_SEMANA.map((d) => {
      const existing = availability
        .filter((a) => a.dia_semana === d.valor)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      return {
        diaSemana: d.valor,
        abierto: existing.length > 0,
        plages:
          existing.length > 0
            ? existing.map((a) => ({ horaInicio: a.hora_inicio.slice(0, 5), horaFin: a.hora_fin.slice(0, 5) }))
            : [{ horaInicio: '09:00', horaFin: '18:00' }],
      }
    })
  )
  const [duracion, setDuracion] = useState(duracionCitaMin)
  const [buffer, setBuffer] = useState(bufferMin)
  const [anticipacionMin, setAnticipacionMin] = useState(anticipacionMinHoras)
  const [anticipacionMax, setAnticipacionMax] = useState(anticipacionMaxDias)
  const [loading, setLoading] = useState(false)

  const [slugDraft, setSlugDraft] = useState(organizationSlug ?? '')
  const [slugLoading, setSlugLoading] = useState(false)

  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevoMotivo, setNuevoMotivo] = useState('')
  const [blocked, setBlocked] = useState(blockedDates)

  const toggleDia = (i: number, abierto: boolean) => {
    setHorarios((prev) => prev.map((h, j) => (j === i ? { ...h, abierto } : h)))
  }

  const updatePlage = (diaIdx: number, plageIdx: number, campo: keyof Plage, valor: string) => {
    setHorarios((prev) =>
      prev.map((h, j) =>
        j === diaIdx ? { ...h, plages: h.plages.map((p, k) => (k === plageIdx ? { ...p, [campo]: valor } : p)) } : h
      )
    )
  }

  const agregarPlage = (diaIdx: number) => {
    setHorarios((prev) =>
      prev.map((h, j) =>
        j === diaIdx && h.plages.length < MAX_PLAGES_POR_DIA ? { ...h, plages: [...h.plages, { horaInicio: '09:00', horaFin: '18:00' }] } : h
      )
    )
  }

  // Jamais sur la premiere plage (index 0) -- elle reste liee au toggle jour actif/inactif, seules
  // les plages additionnelles ont un bouton de suppression.
  const quitarPlage = (diaIdx: number, plageIdx: number) => {
    if (plageIdx === 0) return
    setHorarios((prev) => prev.map((h, j) => (j === diaIdx ? { ...h, plages: h.plages.filter((_, k) => k !== plageIdx) } : h)))
  }

  const guardarHorarios = async () => {
    const errorValidacion = validarHorarios(horarios)
    if (errorValidacion) {
      toast.error(errorValidacion)
      return
    }
    setLoading(true)
    const payload = horarios
      .filter((h) => h.abierto)
      .flatMap((h) => h.plages.map((p) => ({ diaSemana: h.diaSemana, horaInicio: p.horaInicio, horaFin: p.horaFin })))
    const result = await updateDisponibilidadAction(payload, {
      duracionCitaMin: duracion,
      bufferMin: buffer,
      anticipacionMinHoras: anticipacionMin,
      anticipacionMaxDias: anticipacionMax,
    })
    if (result.ok) {
      toast.success('Disponibilidad guardada')
    } else {
      toast.error(result.error ?? 'Error al guardar')
    }
    setLoading(false)
  }

  const guardarSlug = async () => {
    setSlugLoading(true)
    const result = await updateSlugAction(slugDraft)
    if (result.ok) {
      setSlugDraft(result.slug ?? slugDraft)
      toast.success('Enlace actualizado')
    } else {
      toast.error(result.error ?? 'Error al actualizar el enlace')
    }
    setSlugLoading(false)
  }

  const agregarFechaBloqueada = async () => {
    if (!nuevaFecha) return
    const result = await addBlockedDateAction(nuevaFecha, nuevoMotivo || null)
    if (result.ok && result.blockedDate) {
      setBlocked((prev) => [...prev, result.blockedDate].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setNuevaFecha('')
      setNuevoMotivo('')
      toast.success('Fecha bloqueada')
    } else {
      toast.error(result.error ?? 'Error al bloquear la fecha')
    }
  }

  const quitarFechaBloqueada = async (id: string) => {
    const result = await removeBlockedDateAction(id)
    if (result.ok) {
      setBlocked((prev) => prev.filter((b) => b.id !== id))
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-800">Disponibilidad</h1>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs text-gray-500">
        Próximamente: reserva nativa en Núcleo. Configura tus horarios desde ahora -- Calendly sigue funcionando normalmente mientras tanto.
      </p>

      {/* Enlace público */}
      <div className="mb-5">
        <label className="mb-1 block text-xs font-medium text-gray-600">Tu enlace de reserva</label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 px-3 text-sm text-gray-400">
            nucleo.clinic/reservar/
          </span>
          <input
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            placeholder="dr-martinez"
            className="flex-1 rounded-r-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
          />
          <button
            type="button"
            onClick={guardarSlug}
            disabled={slugLoading || !slugDraft.trim()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-[#6926D2] hover:text-[#6926D2] active:scale-[0.98] disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Horaires par jour -- une ou plusieurs plages (ex. pause déjeuner) */}
      <div className="mb-5 space-y-3">
        {DIAS_SEMANA.map((d, i) => (
          <div key={d.valor} className="flex items-start gap-3">
            <label className="flex w-28 shrink-0 items-center gap-2 pt-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={horarios[i].abierto} onChange={(e) => toggleDia(i, e.target.checked)} />
              {d.label}
            </label>
            {horarios[i].abierto && (
              <div className="flex flex-1 flex-col gap-1.5">
                {horarios[i].plages.map((p, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={p.horaInicio}
                      onChange={(e) => updatePlage(i, k, 'horaInicio', e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={p.horaFin}
                      onChange={(e) => updatePlage(i, k, 'horaFin', e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                    {k > 0 && (
                      <button
                        type="button"
                        onClick={() => quitarPlage(i, k)}
                        aria-label="Quitar franja"
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {horarios[i].plages.length < MAX_PLAGES_POR_DIA && (
                  <button
                    type="button"
                    onClick={() => agregarPlage(i)}
                    className="self-start text-xs font-medium text-[#6926D2] hover:underline"
                  >
                    + Agregar franja
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paramètres */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            Duración de la cita (min)
            <InfoTooltip text="Cuánto dura cada consulta -- define el tamaño de cada franja reservable." />
          </label>
          <input type="number" min={5} max={480} value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            Margen entre citas (min)
            <InfoTooltip text="Tiempo libre añadido automáticamente después de cada cita, antes de la siguiente." />
          </label>
          <input type="number" min={0} max={120} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            Anticipación mínima (horas)
            <InfoTooltip text="El paciente no podrá reservar con menos de este tiempo de antelación." />
          </label>
          <input type="number" min={0} max={720} value={anticipacionMin} onChange={(e) => setAnticipacionMin(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            Anticipación máxima (días)
            <InfoTooltip text="Hasta cuántos días en el futuro se pueden ver y reservar horarios." />
          </label>
          <input type="number" min={1} max={365} value={anticipacionMax} onChange={(e) => setAnticipacionMax(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </div>

      <button
        type="button"
        onClick={guardarHorarios}
        disabled={loading}
        className="mb-6 w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
      >
        Guardar horarios
      </button>

      {/* Fechas bloqueadas */}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-gray-700">Fechas bloqueadas (vacaciones, feriados)</h3>
        <div className="mb-2 space-y-1">
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
              <span>
                {new Date(`${b.fecha}T00:00:00`).toLocaleDateString('es-PE')}
                {b.motivo && <span className="ml-2 text-gray-400">· {b.motivo}</span>}
              </span>
              <button type="button" onClick={() => quitarFechaBloqueada(b.id)} className="text-xs text-gray-400 hover:text-red-500">
                Quitar
              </button>
            </div>
          ))}
          {blocked.length === 0 && <p className="text-xs text-gray-400">Ninguna fecha bloqueada.</p>}
        </div>
        <div className="flex gap-2">
          <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={nuevoMotivo}
            onChange={(e) => setNuevoMotivo(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
          <button type="button" onClick={agregarFechaBloqueada} disabled={!nuevaFecha} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#6926D2] hover:text-[#6926D2] disabled:opacity-50">
            Bloquear
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
