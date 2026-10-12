'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'

interface PatientNote {
  id: string
  contenido: string
  created_at: string
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )
}

function NotasClinicasCard({ patientId }: { patientId: string }) {
  const [state, setState] = useState<'locked' | 'pin' | 'unlocked'>('locked')
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [codigo, setCodigo] = useState<string | null>(null) // gardé en mémoire uniquement, jamais persisté
  const [notes, setNotes] = useState<PatientNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lock = useCallback(() => {
    setState('locked')
    setCodigo(null)
    setPinDigits(['', '', '', ''])
    setNotes([])
    setNewNote('')
    setError(null)
  }, [])

  // Re-verrouillage automatique si l'onglet passe en arrière-plan
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) lock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [lock])

  const submitPin = async () => {
    const pin = pinDigits.join('')
    if (pin.length !== 4) {
      setError('Ingresa los 4 dígitos')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: pin }),
    })
    const data = await res.json()
    if (res.ok) {
      setCodigo(pin)
      setNotes(data.notes)
      setState('unlocked')
    } else {
      setError(data.error ?? 'Código incorrecto')
      setPinDigits(['', '', '', ''])
    }
    setLoading(false)
  }

  const saveNote = async () => {
    if (!newNote.trim() || !codigo) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, contenido: newNote.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setNotes((prev) => [data.note, ...prev])
      setNewNote('')
      toast.success('Nota guardada')
    } else {
      toast.error(data.error ?? 'Error al guardar la nota')
      if (res.status === 403) lock() // code invalidé entre-temps → reverrouille
    }
    setLoading(false)
  }

  if (state === 'locked') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-[#6926D2]">
          <LockIcon className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-gray-800">Notas clínicas confidenciales</h3>
        <p className="mb-4 mt-1 text-sm text-gray-500">Protegido por código de acceso. Visible solo para ti.</p>
        <button
          type="button"
          onClick={() => setState('pin')}
          className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
        >
          Desbloquear
        </button>
      </div>
    )
  }

  if (state === 'pin') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-800">Notas clínicas confidenciales</h3>
        <p className="mb-4 text-sm text-gray-600">Ingresa tu código de seguridad</p>
        <div className="mb-3 flex justify-center gap-2">
          {pinDigits.map((d, i) => (
            <input
              key={i}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                const next = [...pinDigits]
                next[i] = val
                setPinDigits(next)
                if (val && i < 3) {
                  const el = document.getElementById(`pin-${i + 1}`)
                  el?.focus()
                }
              }}
              id={`pin-${i}`}
              className="h-14 w-12 rounded-xl border border-gray-200 text-center text-xl font-semibold focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
            />
          ))}
        </div>
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState('locked')}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Notas clínicas</h3>
          <p className="text-xs text-gray-400">Acceso autenticado por sesión</p>
        </div>
        <button
          type="button"
          onClick={lock}
          aria-label="Bloquear notas"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100"
        >
          <LockIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
        {notes.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Sin notas registradas.</p>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs text-gray-400">
              {new Date(note.created_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <p className="text-sm leading-relaxed text-gray-700">{note.contenido}</p>
          </div>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600" htmlFor="new-note">
          Nueva nota confidencial
        </label>
        <span className="text-xs text-gray-400">{newNote.length}/500</span>
      </div>
      <textarea
        id="new-note"
        value={newNote}
        onChange={(e) => setNewNote(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="Escribe una observación clínica privada..."
        className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
      />
      <button
        type="button"
        onClick={saveNote}
        disabled={loading || !newNote.trim()}
        className="mt-2 w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
      >
        Guardar nota
      </button>
    </div>
  )
}

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'success',
  en_curso: 'brand',
  pagado: 'success',
  anulado: 'error',
} as const

export function PatientNotFound() {
  return <div className="text-error-600">Paciente no encontrado.</div>
}

export default function PatientDetailView({
  patient,
  appointments,
  presenceRate,
  totalAppointments,
  markedAppointments,
}: {
  patient: { id: string; nom: string; email: string | null; telefono: string | null; created_at: string }
  appointments: Array<{
    id: string
    fecha_cita: string
    hora_cita: string
    statut: string
    presente: boolean | null
    monto_acompte: number
  }>
  presenceRate: number | null
  totalAppointments: number
  markedAppointments: number
}) {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-[#6926D2]">
            {patient.nom.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{patient.nom}</h1>
            <p className="text-sm text-gray-500">
              {patient.email ?? 'Sin email'} · {patient.telefono ?? 'Sin teléfono'}
            </p>
          </div>
        </div>
        <Link href="/dashboard/patients" className="text-sm text-[#6926D2] hover:underline">
          ← Volver
        </Link>
      </div>

      {/* Stats en ligne */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">{totalAppointments}</p>
          <p className="mt-1 text-xs text-gray-500">Citas totales</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">
            {presenceRate !== null ? `${presenceRate}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Tasa de asistencia</p>
          {presenceRate !== null && <p className="mt-0.5 text-xs text-gray-400">{markedAppointments} marcadas</p>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
          <p className="text-3xl font-semibold text-gray-900">
            {appointments.filter((a) => a.presente === false).length}
          </p>
          <p className="mt-1 text-xs text-gray-500">No-shows</p>
        </div>
      </div>

      {/* Historique des RDV */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-800">Historial de citas</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {appointments.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-gray-400">Sin citas registradas.</p>
          )}
          {appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/dashboard/appointments/${appt.id}`}
              className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg">
                  {appt.presente === true ? '✓' : appt.presente === false ? '✗' : '·'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {appt.fecha_cita} a las {appt.hora_cita}
                  </p>
                  <p className="text-xs text-gray-400">
                    {appt.presente === true ? 'Presente' : appt.presente === false ? 'Ausente' : 'Sin marcar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={STATUS_BADGE[appt.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>{appt.statut}</Badge>
                <span className="text-gray-300 group-hover:text-gray-400">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <NotasClinicasCard patientId={patient.id} />
    </div>
  )
}
