'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'

interface PatientNotePhoto {
  id: string
  url: string | null
  created_at: string
}

interface PatientNote {
  id: string
  contenido: string
  categoria: string | null
  created_at: string
  photos?: PatientNotePhoto[]
}

interface ProximoControl {
  fecha: string | null
  meses: number | null
  enviado: boolean
  enviadoAt: string | null
  photoNoteId: string | null
  photoThumbUrl: string | null
}

const MAX_PHOTOS_PER_NOTE = 2
const CATEGORIA_CONTROL = 'Control' // catégorie réservée, jamais dans categorias_notas

const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

function categoryColor(categoria: string) {
  if (categoria === CATEGORIA_CONTROL) return 'bg-orange-100 text-orange-700'
  let hash = 0
  for (let i = 0; i < categoria.length; i++) hash = (hash * 31 + categoria.charCodeAt(i)) >>> 0
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]
}

const CATEGORY_RING_COLORS = [
  'ring-blue-400',
  'ring-emerald-400',
  'ring-amber-400',
  'ring-rose-400',
  'ring-violet-400',
  'ring-cyan-400',
]

function categoryRingColor(categoria: string) {
  if (categoria === CATEGORIA_CONTROL) return 'ring-orange-400'
  let hash = 0
  for (let i = 0; i < categoria.length; i++) hash = (hash * 31 + categoria.charCodeAt(i)) >>> 0
  return CATEGORY_RING_COLORS[hash % CATEGORY_RING_COLORS.length]
}

// Date locale (es-PE) sans l'heure, utilisée comme clé de regroupement des notes du même jour.
function fechaKey(createdAt: string) {
  return new Date(createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Regroupe les notes par jour calendaire, en conservant l'ordre déjà trié (desc) du state `notes`.
function groupNotesByFecha(notes: PatientNote[]) {
  const groups: { key: string; notes: PatientNote[] }[] = []
  for (const note of notes) {
    const key = fechaKey(note.created_at)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.key === key) {
      lastGroup.notes.push(note)
    } else {
      groups.push({ key, notes: [note] })
    }
  }
  return groups
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

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function NotesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function PhotoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5l5.47-5.47a1.5 1.5 0 012.12 0L16 16.5m-3-3l1.47-1.47a1.5 1.5 0 012.12 0L21 16.5M6.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9A2.5 2.5 0 016.5 5z"
      />
    </svg>
  )
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a1.5 1.5 0 001.3 2.25h17.76a1.5 1.5 0 001.3-2.25L13.71 3.86a1.5 1.5 0 00-2.42 0z"
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
  const [newNoteCategoria, setNewNoteCategoria] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categorias, setCategorias] = useState<string[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)

  const [alerta, setAlerta] = useState<string | null>(null)
  const [alertaUpdatedAt, setAlertaUpdatedAt] = useState<string | null>(null)
  const [editingAlerta, setEditingAlerta] = useState(false)
  const [alertaDraft, setAlertaDraft] = useState('')
  const [confirmingClearAlerta, setConfirmingClearAlerta] = useState(false)

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContenido, setEditingContenido] = useState('')
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const [uploadTargetNoteId, setUploadTargetNoteId] = useState<string | null>(null)
  const [uploadingNoteId, setUploadingNoteId] = useState<string | null>(null)
  const [confirmingDeletePhoto, setConfirmingDeletePhoto] = useState<{ noteId: string; photoId: string } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categoriasConFoto, setCategoriasConFoto] = useState<string[]>([])
  const [proximoControl, setProximoControl] = useState<ProximoControl | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false) // dismiss purement local, pas persisté
  const [composerMode, setComposerMode] = useState<'categoria' | 'control'>('categoria')
  const [controlMeses, setControlMeses] = useState<number | ''>('')
  const [programarRecordatorio, setProgramarRecordatorio] = useState(false)

  const lock = useCallback(() => {
    setState('locked')
    setCodigo(null)
    setPinDigits(['', '', '', ''])
    setNotes([])
    setNewNote('')
    setNewNoteCategoria(null)
    setError(null)
    setCategorias([])
    setFiltroCategoria(null)
    setAlerta(null)
    setAlertaUpdatedAt(null)
    setEditingAlerta(false)
    setAlertaDraft('')
    setConfirmingClearAlerta(false)
    setEditingNoteId(null)
    setEditingContenido('')
    setEditingCategoria(null)
    setConfirmingDeleteId(null)
    setUploadTargetNoteId(null)
    setUploadingNoteId(null)
    setConfirmingDeletePhoto(null)
    setLightboxUrl(null)
    setCategoriasConFoto([])
    setProximoControl(null)
    setBannerDismissed(false)
    setComposerMode('categoria')
    setControlMeses('')
    setProgramarRecordatorio(false)
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
      setCategorias(data.categorias ?? [])
      setAlerta(data.alerta ?? null)
      setAlertaUpdatedAt(data.alertaUpdatedAt ?? null)
      setCategoriasConFoto(data.categoriasConFoto ?? [])
      setProximoControl(data.proximoControl ?? null)
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
    const categoria = composerMode === 'control' ? CATEGORIA_CONTROL : newNoteCategoria
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, contenido: newNote.trim(), categoria }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Error al guardar la nota')
      if (res.status === 403) lock()
      setLoading(false)
      return
    }

    const savedNote: PatientNote = { ...data.note, photos: [] }
    setNotes((prev) => [savedNote, ...prev])

    // Mode "Control" avec la case "Programar recordatorio" cochée : on programme en plus la relance,
    // en liant la photo de diagnostic la plus récente (sinon rien).
    if (composerMode === 'control' && programarRecordatorio && controlMeses !== '') {
      const diagnosticoConFoto = notes.find((n) => n.categoria === 'Diagnóstico' && (n.photos?.length ?? 0) > 0)
      const patchRes = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proximo_control_meses: controlMeses,
          proximo_control_photo_note_id: diagnosticoConFoto?.id ?? null,
        }),
      })
      if (patchRes.ok) {
        const patchData = await patchRes.json()
        setProximoControl({
          fecha: patchData.patient.proximo_control_fecha,
          meses: patchData.patient.proximo_control_meses,
          enviado: false,
          enviadoAt: null,
          photoNoteId: patchData.patient.proximo_control_photo_note_id,
          photoThumbUrl: diagnosticoConFoto?.photos?.[0]?.url ?? null,
        })
        setBannerDismissed(false)
        toast.success('Control programado')
      } else {
        toast.error('Nota guardada, pero no se pudo programar el recordatorio')
      }
    } else {
      toast.success('Nota guardada')
    }

    setNewNote('')
    setNewNoteCategoria(null)
    setComposerMode('categoria')
    setControlMeses('')
    setProgramarRecordatorio(false)
    setLoading(false)
  }

  const startEditNote = (note: PatientNote) => {
    setEditingNoteId(note.id)
    setEditingContenido(note.contenido)
    setEditingCategoria(note.categoria)
    setConfirmingDeleteId(null)
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingContenido('')
    setEditingCategoria(null)
  }

  const saveEditNote = async () => {
    if (!codigo || !editingNoteId || !editingContenido.trim()) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/notes/${editingNoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, contenido: editingContenido.trim(), categoria: editingCategoria }),
    })
    const data = await res.json()
    if (res.ok) {
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...data.note, photos: n.photos } : n)))
      toast.success('Nota actualizada')
      cancelEditNote()
    } else {
      toast.error(data.error ?? 'Error al actualizar la nota')
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const confirmDeleteNote = async (noteId: string) => {
    if (!codigo) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success('Nota eliminada')
      setConfirmingDeleteId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Error al eliminar la nota')
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const openFilePicker = (noteId: string) => {
    setUploadTargetNoteId(noteId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const noteId = uploadTargetNoteId
    e.target.value = '' // permet de re-sélectionner le même fichier ensuite
    if (!file || !noteId || !codigo) return

    setUploadingNoteId(noteId)
    const formData = new FormData()
    formData.append('codigo', codigo)
    formData.append('file', file)
    const res = await fetch(`/api/patients/${patientId}/notes/${noteId}/photos`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (res.ok) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, photos: [...(n.photos ?? []), data.photo] } : n))
      )
      toast.success('Foto agregada')
    } else {
      toast.error(data.error ?? 'Error al subir la foto')
      if (res.status === 403) lock()
    }
    setUploadingNoteId(null)
    setUploadTargetNoteId(null)
  }

  const confirmDeletePhoto = async (noteId: string, photoId: string) => {
    if (!codigo) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/notes/${noteId}/photos/${photoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    if (res.ok) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, photos: (n.photos ?? []).filter((p) => p.id !== photoId) } : n))
      )
      toast.success('Foto eliminada')
      setConfirmingDeletePhoto(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Error al eliminar la foto')
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const startEditAlerta = () => {
    setAlertaDraft(alerta ?? '')
    setEditingAlerta(true)
    setConfirmingClearAlerta(false)
  }

  const saveAlerta = async () => {
    if (!codigo) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/alert`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, alerta: alertaDraft.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setAlerta(data.alerta ?? null)
      setAlertaUpdatedAt(data.alertaUpdatedAt ?? null)
      setEditingAlerta(false)
      toast.success('Alerta clínica guardada')
    } else {
      toast.error(data.error ?? 'Error al guardar la alerta')
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const clearAlerta = async () => {
    if (!codigo) return
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/alert`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, alerta: null }),
    })
    const data = await res.json()
    if (res.ok) {
      setAlerta(null)
      setAlertaUpdatedAt(data.alertaUpdatedAt ?? null)
      setConfirmingClearAlerta(false)
      toast.success('Alerta clínica eliminada')
    } else {
      toast.error(data.error ?? 'Error al eliminar la alerta')
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const filteredNotes = filtroCategoria ? notes.filter((n) => n.categoria === filtroCategoria) : notes

  function allowsPhoto(categoria: string | null) {
    if (!categoria) return false
    return categoria === CATEGORIA_CONTROL || categoriasConFoto.includes(categoria)
  }

  // Catégories déjà utilisées aujourd'hui -- bornage "une entrée par catégorie par jour" (pas de 10 000 entrées).
  const todayKey = fechaKey(new Date().toISOString())
  const categoriasUtiliseesAujourdhui = new Set(
    notes.filter((n) => fechaKey(n.created_at) === todayKey && n.categoria).map((n) => n.categoria as string)
  )

  const renderPhotosRow = (note: PatientNote) => {
    if (!allowsPhoto(note.categoria)) return null
    const photos = note.photos ?? []
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="group/photo relative h-14 w-14 flex-shrink-0">
            {photo.url ? (
              <button
                type="button"
                onClick={() => setLightboxUrl(photo.url)}
                className="h-full w-full overflow-hidden rounded-lg border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Foto clínica" className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400">
                <PhotoIcon className="h-5 w-5" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmingDeletePhoto({ noteId: note.id, photoId: photo.id })}
              aria-label="Eliminar foto"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white opacity-0 transition-opacity group-hover/photo:opacity-100"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_NOTE && (
          <button
            type="button"
            onClick={() => openFilePicker(note.id)}
            disabled={uploadingNoteId === note.id}
            className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-[#6926D2] hover:text-[#6926D2] disabled:opacity-50"
          >
            {uploadingNoteId === note.id ? (
              <span className="text-[10px]">...</span>
            ) : (
              <>
                <PhotoIcon className="h-4 w-4" />
                <span className="text-[9px]">+ Foto</span>
              </>
            )}
          </button>
        )}
        {confirmingDeletePhoto?.noteId === note.id && (
          <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs">
            <span className="text-gray-600">¿Eliminar foto?</span>
            <button
              type="button"
              onClick={() => setConfirmingDeletePhoto(null)}
              className="font-medium text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmDeletePhoto(note.id, confirmingDeletePhoto.photoId)}
              disabled={loading}
              className="font-medium text-red-600 hover:text-red-700"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>
    )
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Cerrar"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="Foto clínica" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <NotesIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Notas clínicas</h3>
            <p className="text-xs text-gray-400">Acceso autenticado por sesión</p>
          </div>
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

      {/* Alerta clínica épinglée */}
      {alerta && !editingAlerta && (
        <div className="group mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <WarningIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">{alerta}</p>
                {alertaUpdatedAt && (
                  <p className="mt-1 text-xs text-amber-600">
                    Actualizado el {new Date(alertaUpdatedAt).toLocaleDateString('es')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={startEditAlerta}
                aria-label="Editar alerta"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClearAlerta(true)}
                aria-label="Eliminar alerta"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {confirmingClearAlerta && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
              <p className="text-xs text-amber-800">¿Eliminar esta alerta clínica?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClearAlerta(false)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={clearAlerta}
                  disabled={loading}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!alerta && !editingAlerta && (
        <button
          type="button"
          onClick={startEditAlerta}
          className="mb-4 text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          + Agregar alerta clínica
        </button>
      )}

      {editingAlerta && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-amber-800" htmlFor="alerta-draft">
              Alerta clínica (ej. alergias)
            </label>
            <span className="text-xs text-amber-600">{alertaDraft.length}/300</span>
          </div>
          <textarea
            id="alerta-draft"
            value={alertaDraft}
            onChange={(e) => setAlertaDraft(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="Ej: Alergia a la penicilina"
            className="w-full resize-none rounded-lg border border-amber-200 bg-white p-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditingAlerta(false)}
              className="flex-1 rounded-lg border border-amber-200 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveAlerta}
              disabled={loading}
              className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Encart épinglé : photo de diagnóstico associée au próximo control */}
      {proximoControl?.fecha && !bannerDismissed && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
          {proximoControl.photoThumbUrl ? (
            <button
              type="button"
              onClick={() => setLightboxUrl(proximoControl.photoThumbUrl)}
              className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-orange-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proximoControl.photoThumbUrl} alt="Foto de diagnóstico" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs font-semibold text-orange-800">
              {proximoControl.photoThumbUrl ? 'Foto de diagnóstico asociada' : 'Control programado'}
            </p>
            <p className="text-xs text-orange-600">
              {new Date(proximoControl.fecha).toLocaleDateString('es-PE')}
              {proximoControl.meses ? ` · dentro de ${proximoControl.meses} ${proximoControl.meses === 1 ? 'mes' : 'meses'}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Ocultar"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-orange-400 hover:bg-orange-100"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filtros por categoría */}
      {(categorias.length > 0 || notes.some((n) => n.categoria === CATEGORIA_CONTROL)) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroCategoria(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filtroCategoria === null ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(cat)} ${
                filtroCategoria === cat ? `ring-2 ${categoryRingColor(cat)}` : 'opacity-60 hover:opacity-100'
              }`}
            >
              {cat}
            </button>
          ))}
          {notes.some((n) => n.categoria === CATEGORIA_CONTROL) && (
            <button
              type="button"
              onClick={() => setFiltroCategoria(CATEGORIA_CONTROL)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(CATEGORIA_CONTROL)} ${
                filtroCategoria === CATEGORIA_CONTROL ? 'ring-2 ring-orange-400' : 'opacity-60 hover:opacity-100'
              }`}
            >
              ⏰ Control
            </button>
          )}
        </div>
      )}

      <div className="mb-4 max-h-96 space-y-4 overflow-y-auto">
        {filteredNotes.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Sin notas registradas.</p>}
        {groupNotesByFecha(filteredNotes).map((group) => (
          <div key={group.key}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {group.key} · {group.notes.length} {group.notes.length === 1 ? 'entrada' : 'entradas'}
            </p>
            <div className="space-y-2">
              {group.notes.map((note) => (
                <div key={note.id} className="group rounded-lg bg-gray-50 p-3">
                  {editingNoteId === note.id ? (
              <div>
                <textarea
                  value={editingContenido}
                  onChange={(e) => setEditingContenido(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2.5 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                />
                {categorias.length > 0 && (
                  <select
                    value={editingCategoria ?? ''}
                    onChange={(e) => setEditingCategoria(e.target.value || null)}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
                {renderPhotosRow(note)}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEditNote}
                    className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveEditNote}
                    disabled={loading || !editingContenido.trim()}
                    className="flex-1 rounded-lg bg-[#6926D2] py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {note.categoria && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(note.categoria)}`}>
                        {note.categoria}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEditNote(note)}
                      aria-label="Editar nota"
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(note.id)}
                      aria-label="Eliminar nota"
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-red-600"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{note.contenido}</p>
                {renderPhotosRow(note)}
                {confirmingDeleteId === note.id && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <p className="text-xs text-gray-600">¿Eliminar esta nota?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteNote(note.id)}
                        disabled={loading}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {categorias.map((cat) => {
          const dejaUtilisee = categoriasUtiliseesAujourdhui.has(cat)
          const selected = composerMode === 'categoria' && newNoteCategoria === cat
          return (
            <button
              key={cat}
              type="button"
              disabled={dejaUtilisee && !selected}
              onClick={() => {
                setComposerMode('categoria')
                setNewNoteCategoria(cat)
              }}
              title={dejaUtilisee && !selected ? 'Ya hay una entrada de esta categoría hoy' : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(cat)} ${
                selected ? `ring-2 ${categoryRingColor(cat)}` : dejaUtilisee ? 'opacity-30' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {cat}
            </button>
          )
        })}
        {!categoriasUtiliseesAujourdhui.has(CATEGORIA_CONTROL) && (
          <button
            type="button"
            onClick={() => {
              setComposerMode('control')
              setNewNoteCategoria(null)
            }}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(CATEGORIA_CONTROL)} ${
              composerMode === 'control' ? 'ring-2 ring-orange-400' : 'opacity-60 hover:opacity-100'
            }`}
          >
            ⏰ Control
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setComposerMode('categoria')
            setNewNoteCategoria(null)
          }}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            composerMode === 'categoria' && newNoteCategoria === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 opacity-60 hover:opacity-100'
          }`}
        >
          Sin categoría
        </button>
      </div>

      {composerMode === 'control' && (
        <div className="mb-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-orange-800">
            <input
              type="checkbox"
              checked={programarRecordatorio}
              onChange={(e) => setProgramarRecordatorio(e.target.checked)}
            />
            Programar recordatorio automático
          </label>
          {programarRecordatorio && (
            <select
              value={controlMeses}
              onChange={(e) => setControlMeses(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="mt-2 w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-orange-400 focus:outline-none"
            >
              <option value="">Elegir...</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Dentro de {m} {m === 1 ? 'mes' : 'meses'}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1.5 text-[11px] text-orange-500">
            {programarRecordatorio
              ? 'Se enviará un email automático con link de reserva cuando llegue la fecha.'
              : 'Déjalo sin marcar si solo quieres registrar el resultado de este control.'}
          </p>
        </div>
      )}

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
      {(composerMode === 'control' || allowsPhoto(newNoteCategoria)) && (
        <button
          type="button"
          disabled
          title="Guarda la nota antes de agregar una foto"
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300"
        >
          <PhotoIcon className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={saveNote}
        disabled={loading || !newNote.trim() || (composerMode === 'control' && programarRecordatorio && controlMeses === '')}
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

// Prefixees par ! (important) : le parent "divide-y divide-gray-50" genere une regle
// composite (.divide-gray-50 > :not([hidden]) ~ :not([hidden])) de specificite plus
// elevee qu'une simple classe et fixe border-color (shorthand 4 cotes) sur chaque ligne
// sauf la premiere -- sans !important elle ecrase silencieusement border-l-*-400 ici.
const STATUS_BORDER = {
  pendiente: '!border-l-warning-400',
  confirmado: '!border-l-success-400',
  en_curso: '!border-l-brand-400',
  pagado: '!border-l-success-400',
  anulado: '!border-l-error-400',
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
    <div className="max-w-6xl space-y-6">
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

      {/* Historique des RDV + Notas clínicas côte à côte sur desktop, empilés sur mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Historique des RDV */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CalendarIcon className="h-4 w-4" />
            </div>
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
                className={`group flex items-center justify-between border-l-[3px] px-5 py-3 transition-colors hover:bg-gray-50 ${
                  STATUS_BORDER[appt.statut as keyof typeof STATUS_BORDER] ?? '!border-l-gray-200'
                }`}
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
    </div>
  )
}
