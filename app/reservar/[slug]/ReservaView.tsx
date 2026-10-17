'use client'

import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import esMessages from '@/messages/es.json'
import ptMessages from '@/messages/pt.json'

const BOOKING_MESSAGES: Record<'es' | 'pt', typeof esMessages.booking> = {
  es: esMessages.booking,
  pt: ptMessages.booking,
}

// Liste LATAM codee en dur, pas de nouvelle dependance. Etendre cette liste plus tard si le marche
// s'elargit hors LATAM -- volontairement limitee aux pays probables du client pour l'instant.
const INDICATIVOS_LATAM = [
  { pais: 'PE', nombre: 'Perú', indicativo: '+51', bandera: '🇵🇪' },
  { pais: 'CL', nombre: 'Chile', indicativo: '+56', bandera: '🇨🇱' },
  { pais: 'CO', nombre: 'Colombia', indicativo: '+57', bandera: '🇨🇴' },
  { pais: 'MX', nombre: 'México', indicativo: '+52', bandera: '🇲🇽' },
  { pais: 'AR', nombre: 'Argentina', indicativo: '+54', bandera: '🇦🇷' },
  { pais: 'BR', nombre: 'Brasil', indicativo: '+55', bandera: '🇧🇷' },
  { pais: 'EC', nombre: 'Ecuador', indicativo: '+593', bandera: '🇪🇨' },
  { pais: 'BO', nombre: 'Bolivia', indicativo: '+591', bandera: '🇧🇴' },
  { pais: 'UY', nombre: 'Uruguay', indicativo: '+598', bandera: '🇺🇾' },
  { pais: 'PY', nombre: 'Paraguay', indicativo: '+595', bandera: '🇵🇾' },
]

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface MesResponse {
  dias: string[]
  hoy: string
  maxFecha: string
}

export default function ReservaView({
  organizationNombre,
  organizationPais,
  slug,
  langue,
}: {
  organizationNombre: string
  organizationPais: string
  slug: string
  langue: 'es' | 'pt'
}) {
  const [displayedMonth, setDisplayedMonth] = useState(mesActualUtc())
  const [diasDisponibles, setDiasDisponibles] = useState<string[]>([])
  const [hoy, setHoy] = useState<string | null>(null)
  const [maxFecha, setMaxFecha] = useState<string | null>(null)
  const [loadingMes, setLoadingMes] = useState(true)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState(
    INDICATIVOS_LATAM.find((i) => i.pais === organizationPais)?.indicativo ?? INDICATIVOS_LATAM[0].indicativo
  )
  const [telefonoNumero, setTelefonoNumero] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const m = BOOKING_MESSAGES[langue]

  useEffect(() => {
    setLoadingMes(true)
    fetch(`/api/public/reservar/${slug}?mes=${displayedMonth}`)
      .then((r) => r.json())
      .then((data: MesResponse) => {
        setDiasDisponibles(data.dias ?? [])
        setHoy(data.hoy ?? null)
        setMaxFecha(data.maxFecha ?? null)
      })
      .finally(() => setLoadingMes(false))
    setSelectedDate(null)
    setSelectedSlot(null)
  }, [displayedMonth, slug])

  const seleccionarDia = (fecha: string) => {
    setSelectedDate(fecha)
    setSelectedSlot(null)
    setLoadingSlots(true)
    fetch(`/api/public/reservar/${slug}?fecha=${fecha}`)
      .then((r) => r.json())
      .then((data: { slots: string[] }) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }

  const volverAlCalendario = () => {
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  const volverAHorarios = () => {
    setSelectedSlot(null)
  }

  const validarFormulario = () => {
    const errores: Record<string, string> = {}
    if (!nombre.trim()) errores.nombre = langue === 'pt' ? 'Informe seu nome completo' : 'Ingresa tu nombre completo'
    if (!EMAIL_RE.test(email.trim())) errores.email = langue === 'pt' ? 'Informe um e-mail válido' : 'Ingresa un email válido'
    if (!telefonoNumero.trim() || telefonoNumero.replace(/\D/g, '').length < 6)
      errores.telefono = langue === 'pt' ? 'Informe um telefone válido' : 'Ingresa un número de teléfono válido'
    setFormErrors(errores)
    return Object.keys(errores).length === 0
  }

  const confirmarReserva = () => {
    if (!validarFormulario()) return
    toast(m.comingSoonMessage, { icon: '🚧' })
  }

  const mesAnterior = sumarMeses(displayedMonth, -1)
  const mesSiguiente = sumarMeses(displayedMonth, 1)
  // "Precedent" desactive si on est deja sur le mois en cours (cote tenant) -- on ne remonte jamais avant.
  const puedeIrAtras = hoy ? displayedMonth > hoy.slice(0, 7) : false
  const puedeIrAdelante = maxFecha ? mesSiguiente <= maxFecha.slice(0, 7) : true

  const [anio, mesNum] = displayedMonth.split('-').map(Number)
  const primerDiaSemana = new Date(Date.UTC(anio, mesNum - 1, 1)).getUTCDay()
  const diasEnMes = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate()
  const celdas: (string | null)[] = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => `${anio}-${pad(mesNum)}-${pad(i + 1)}`)]

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-10">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center text-xl font-semibold text-gray-800">{organizationNombre}</h1>
        <p className="mb-6 text-center text-sm text-gray-500">{langue === 'pt' ? 'Agende sua consulta' : 'Reserva tu cita'}</p>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
                <p className="py-10 text-center text-sm text-gray-400">{m.loading}</p>
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
                          disponible
                            ? 'bg-violet-50 font-medium text-[#6926D2] hover:bg-violet-100'
                            : 'text-gray-300'
                        }`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              )}
              {!loadingMes && diasDisponibles.length === 0 && (
                <p className="mt-4 text-center text-xs text-gray-400">
                  {langue === 'pt' ? 'Não há horários disponíveis neste mês.' : 'No hay horarios disponibles este mes.'}
                </p>
              )}
            </>
          )}

          {selectedDate && !selectedSlot && (
            <div>
              <button type="button" onClick={volverAlCalendario} className="mb-3 text-xs font-medium text-[#6926D2] hover:underline">
                ← {m.back}
              </button>
              <p className="mb-3 text-sm font-semibold text-gray-800">{selectedDate}</p>
              {loadingSlots ? (
                <p className="py-10 text-center text-sm text-gray-400">{m.loading}</p>
              ) : slots.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">{m.noSlotsThisDay}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((hora) => (
                    <button
                      key={hora}
                      type="button"
                      onClick={() => setSelectedSlot(hora)}
                      className="rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 transition-all hover:border-[#6926D2] hover:text-[#6926D2] active:scale-[0.97]"
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedSlot && (
            <div>
              <button type="button" onClick={volverAHorarios} className="mb-3 text-xs font-medium text-[#6926D2] hover:underline">
                ← {m.back}
              </button>
              <div className="mb-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-[#6926D2]">
                {selectedDate} · {selectedSlot}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{m.nombreLabel}</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                  />
                  {formErrors.nombre && <p className="mt-1 text-xs text-red-600">{formErrors.nombre}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{m.emailLabel}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                  />
                  {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{m.telefonoLabel}</label>
                  <div className="flex gap-2">
                    <select
                      value={indicativo}
                      onChange={(e) => setIndicativo(e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                    >
                      {INDICATIVOS_LATAM.map((i) => (
                        <option key={i.pais} value={i.indicativo}>
                          {i.bandera} {i.indicativo}
                        </option>
                      ))}
                    </select>
                    <input
                      value={telefonoNumero}
                      onChange={(e) => setTelefonoNumero(e.target.value)}
                      placeholder="987654321"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                    />
                  </div>
                  {formErrors.telefono && <p className="mt-1 text-xs text-red-600">{formErrors.telefono}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={confirmarReserva}
                className="mt-5 w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
              >
                {m.confirmarButton}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
