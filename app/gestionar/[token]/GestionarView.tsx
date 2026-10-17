'use client'

import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const DIAS_CORTOS: Record<'es' | 'pt', string[]> = {
  es: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  pt: ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'],
}

const MESES: Record<'es' | 'pt', string[]> = {
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function mesActualUtc(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`
}

function sumarMeses(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

interface GestionResponse {
  organizacion: { nom: string; slug: string | null; langue: string }
  fechaCita: string
  horaCita: string
  statut: string
  yaAnulado: boolean
  puedeGestionar: boolean
}

interface MesResponse {
  dias: string[]
  hoy: string
  maxFecha: string
}

type Vista = 'cargando' | 'inicio' | 'confirmarCancelar' | 'reprogramar' | 'confirmarReprogramar' | 'cancelado' | 'reprogramado' | 'error'

const T = {
  es: {
    loading: 'Cargando...',
    error: 'No se pudo cargar tu cita. Intenta de nuevo más tarde.',
    yaAnulado: 'Esta cita ya fue cancelada.',
    plazoVencido: 'El plazo para cancelar o reprogramar esta cita ya pasó. Contáctanos directamente.',
    tuCita: 'Tu cita con',
    cancelarBtn: 'Cancelar mi cita',
    reprogramarBtn: 'Reprogramar',
    confirmCancelarTitle: '¿Seguro que deseas cancelar tu cita?',
    confirmCancelarDesc: 'Esta acción no se puede deshacer.',
    siCancelar: 'Sí, cancelar',
    noVolver: 'No, volver',
    canceladoTitle: 'Tu cita fue cancelada.',
    reprogramadoTitle: 'Tu cita fue reprogramada a',
    selectDate: 'Selecciona una nueva fecha',
    selectTime: 'Selecciona un horario',
    noSlotsThisDay: 'No hay horarios disponibles este día.',
    noSlotsThisMonth: 'No hay horarios disponibles este mes.',
    back: 'Volver',
    confirmarReprogramarTitle: '¿Confirmas mover tu cita a',
    siConfirmar: 'Sí, confirmar',
    genericError: 'Algo salió mal',
  },
  pt: {
    loading: 'Carregando...',
    error: 'Não foi possível carregar sua consulta. Tente novamente mais tarde.',
    yaAnulado: 'Esta consulta já foi cancelada.',
    plazoVencido: 'O prazo para cancelar ou remarcar esta consulta já passou. Entre em contato diretamente.',
    tuCita: 'Sua consulta com',
    cancelarBtn: 'Cancelar minha consulta',
    reprogramarBtn: 'Remarcar',
    confirmCancelarTitle: 'Tem certeza que deseja cancelar sua consulta?',
    confirmCancelarDesc: 'Esta ação não pode ser desfeita.',
    siCancelar: 'Sim, cancelar',
    noVolver: 'Não, voltar',
    canceladoTitle: 'Sua consulta foi cancelada.',
    reprogramadoTitle: 'Sua consulta foi remarcada para',
    selectDate: 'Selecione uma nova data',
    selectTime: 'Selecione um horário',
    noSlotsThisDay: 'Não há horários disponíveis neste dia.',
    noSlotsThisMonth: 'Não há horários disponíveis neste mês.',
    back: 'Voltar',
    confirmarReprogramarTitle: 'Confirma mover sua consulta para',
    siConfirmar: 'Sim, confirmar',
    genericError: 'Algo deu errado',
  },
}

export default function GestionarView({
  token,
  organizationNombre,
  langue,
}: {
  token: string
  organizationNombre: string
  langue: 'es' | 'pt'
}) {
  const t = T[langue]
  const [vista, setVista] = useState<Vista>('cargando')
  const [data, setData] = useState<GestionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Etat du selecteur de creneau (reprogrammation) -- meme principe que ReservaView.tsx, qui
  // reutilise les memes endpoints publics /api/public/reservar/[slug]?mes=/?fecha=.
  const [displayedMonth, setDisplayedMonth] = useState(mesActualUtc())
  const [diasDisponibles, setDiasDisponibles] = useState<string[]>([])
  const [hoy, setHoy] = useState<string | null>(null)
  const [maxFecha, setMaxFecha] = useState<string | null>(null)
  const [loadingMes, setLoadingMes] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/gestionar/${token}`)
      .then((r) => r.json())
      .then((d: GestionResponse) => {
        setData(d)
        setVista('inicio')
      })
      .catch(() => setVista('error'))
  }, [token])

  useEffect(() => {
    if (vista !== 'reprogramar' || !data?.organizacion.slug) return
    setLoadingMes(true)
    fetch(`/api/public/reservar/${data.organizacion.slug}?mes=${displayedMonth}`)
      .then((r) => r.json())
      .then((d: MesResponse) => {
        setDiasDisponibles(d.dias ?? [])
        setHoy(d.hoy ?? null)
        setMaxFecha(d.maxFecha ?? null)
      })
      .finally(() => setLoadingMes(false))
    setSelectedDate(null)
    setSelectedSlot(null)
  }, [vista, displayedMonth, data?.organizacion.slug])

  const seleccionarDia = (fecha: string) => {
    if (!data?.organizacion.slug) return
    setSelectedDate(fecha)
    setSelectedSlot(null)
    setLoadingSlots(true)
    fetch(`/api/public/reservar/${data.organizacion.slug}?fecha=${fecha}`)
      .then((r) => r.json())
      .then((d: { slots: string[] }) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }

  const confirmarCancelacion = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/gestionar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelar' }),
      })
      const resData = await res.json()
      if (!res.ok) {
        toast.error(resData.error ?? t.genericError)
        return
      }
      setVista('cancelado')
    } catch {
      toast.error(t.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmarReprogramacion = async () => {
    if (!selectedDate || !selectedSlot) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/gestionar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reprogramar', fecha: selectedDate, hora: selectedSlot }),
      })
      const resData = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(resData.error)
          seleccionarDia(selectedDate)
          setSelectedSlot(null)
          setVista('reprogramar')
        } else {
          toast.error(resData.error ?? t.genericError)
        }
        return
      }
      setVista('reprogramado')
    } catch {
      toast.error(t.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  const mesAnterior = sumarMeses(displayedMonth, -1)
  const mesSiguiente = sumarMeses(displayedMonth, 1)
  const puedeIrAtras = hoy ? displayedMonth > hoy.slice(0, 7) : false
  const puedeIrAdelante = maxFecha ? mesSiguiente <= maxFecha.slice(0, 7) : true

  const [anio, mesNum] = displayedMonth.split('-').map(Number)
  const primerDiaSemana = new Date(Date.UTC(anio, mesNum - 1, 1)).getUTCDay()
  const diasEnMes = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate()
  const celdas: (string | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => `${anio}-${pad(mesNum)}-${pad(i + 1)}`),
  ]

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-10">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-center text-xl font-semibold text-gray-800">{organizationNombre}</h1>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {vista === 'cargando' && <p className="py-10 text-center text-sm text-gray-400">{t.loading}</p>}

          {vista === 'error' && <p className="py-10 text-center text-sm text-gray-500">{t.error}</p>}

          {vista === 'inicio' && data && (
            <div>
              {data.yaAnulado ? (
                <p className="py-6 text-center text-sm font-medium text-gray-700">{t.yaAnulado}</p>
              ) : (
                <>
                  <p className="mb-1 text-sm text-gray-500">{t.tuCita}</p>
                  <p className="mb-4 text-sm font-semibold text-gray-800">{organizationNombre}</p>
                  <div className="mb-5 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-[#6926D2]">
                    {data.fechaCita} · {data.horaCita}
                  </div>

                  {!data.puedeGestionar ? (
                    <p className="text-sm text-gray-500">{t.plazoVencido}</p>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setVista('reprogramar')}
                        className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
                      >
                        {t.reprogramarBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVista('confirmarCancelar')}
                        className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.98]"
                      >
                        {t.cancelarBtn}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {vista === 'confirmarCancelar' && data && (
            <div className="text-center">
              <p className="mb-1 text-sm font-semibold text-gray-800">{t.confirmCancelarTitle}</p>
              <p className="mb-5 text-xs text-gray-500">{t.confirmCancelarDesc}</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={confirmarCancelacion}
                  disabled={submitting}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? t.loading : t.siCancelar}
                </button>
                <button
                  type="button"
                  onClick={() => setVista('inicio')}
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
                >
                  {t.noVolver}
                </button>
              </div>
            </div>
          )}

          {vista === 'cancelado' && <p className="py-6 text-center text-sm font-medium text-gray-700">{t.canceladoTitle}</p>}

          {vista === 'reprogramado' && selectedDate && selectedSlot && (
            <p className="py-6 text-center text-sm font-medium text-gray-700">
              {t.reprogramadoTitle} {selectedDate} · {selectedSlot}
            </p>
          )}

          {vista === 'reprogramar' && (
            <>
              <button type="button" onClick={() => setVista('inicio')} className="mb-3 text-xs font-medium text-[#6926D2] hover:underline">
                ← {t.back}
              </button>

              {!selectedDate && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDisplayedMonth(mesAnterior)}
                      disabled={!puedeIrAtras}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      aria-label="Mes anterior"
                    >
                      ‹
                    </button>
                    <p className="text-sm font-semibold text-gray-800">
                      {MESES[langue][mesNum - 1]} {anio}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDisplayedMonth(mesSiguiente)}
                      disabled={!puedeIrAdelante}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      aria-label="Mes siguiente"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
                    {DIAS_CORTOS[langue].map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>

                  {loadingMes ? (
                    <p className="py-10 text-center text-sm text-gray-400">{t.loading}</p>
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {celdas.map((fecha, i) => {
                        if (!fecha) return <span key={i} />
                        const disponible = diasDisponibles.includes(fecha)
                        const dia = Number(fecha.slice(8, 10))
                        return (
                          <button
                            key={fecha}
                            type="button"
                            disabled={!disponible}
                            onClick={() => seleccionarDia(fecha)}
                            className={`flex h-9 items-center justify-center rounded-lg text-sm transition-all active:scale-[0.95] ${
                              disponible ? 'bg-violet-50 font-medium text-[#6926D2] hover:bg-violet-100' : 'text-gray-300'
                            }`}
                          >
                            {dia}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {!loadingMes && diasDisponibles.length === 0 && (
                    <p className="mt-4 text-center text-xs text-gray-400">{t.noSlotsThisMonth}</p>
                  )}
                </>
              )}

              {selectedDate && !selectedSlot && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null)
                      setSelectedSlot(null)
                    }}
                    className="mb-3 text-xs font-medium text-[#6926D2] hover:underline"
                  >
                    ← {t.back}
                  </button>
                  <p className="mb-3 text-sm font-semibold text-gray-800">{selectedDate}</p>
                  {loadingSlots ? (
                    <p className="py-10 text-center text-sm text-gray-400">{t.loading}</p>
                  ) : slots.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-400">{t.noSlotsThisDay}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((hora) => (
                        <button
                          key={hora}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(hora)
                            setVista('confirmarReprogramar')
                          }}
                          className="rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-all hover:border-[#6926D2] hover:text-[#6926D2] active:scale-[0.97]"
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {vista === 'confirmarReprogramar' && selectedDate && selectedSlot && (
            <div className="text-center">
              <p className="mb-1 text-sm font-semibold text-gray-800">{t.confirmarReprogramarTitle}</p>
              <div className="mb-5 mt-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-[#6926D2]">
                {selectedDate} · {selectedSlot}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={confirmarReprogramacion}
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? t.loading : t.siConfirmar}
                </button>
                <button
                  type="button"
                  onClick={() => setVista('reprogramar')}
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
                >
                  {t.noVolver}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
