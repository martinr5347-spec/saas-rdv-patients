'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import toast from 'react-hot-toast'
import Badge from '@/components/ui/Badge'
import { CashIcon } from '@/components/layout/icons'
import { MAX_PHOTOS_PER_NOTE } from '@/lib/patients/notePhotoValidation'
import { ahoraEnFuseau } from '@/lib/utils/timezone'

const INTL_LOCALE: Record<string, string> = { es: 'es-PE', pt: 'pt-BR', fr: 'fr-FR' }

interface PatientNotePhoto {
  id: string
  url: string | null
  created_at: string
  momento: 'antes' | 'despues' | null
}

interface PatientNote {
  id: string
  contenido: string
  categoria: string | null
  created_at: string
  sesionId: string | null
  comentarioFinal?: string | null
  appointmentId?: string | null
  photos?: PatientNotePhoto[]
}

// Catégories dont le contenu alimente le résumé affiché dans Historial de citas (Partie 4) et dans
// l'onglet Resumen (fiche patient en onglets) une fois Notas clínicas déverrouillée -- mêmes
// catégories par défaut que categorias_con_foto (migration 026).
const RESUMEN_CATEGORIAS = ['Diagnóstico', 'Tratamiento']

function truncate(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// Note la plus récente de categoria Diagnóstico/Tratamiento -- notes est déjà trié du plus récent
// au plus ancien (ordre serveur conservé par saveSession, cf. plus bas), donc le premier match est
// le plus récent. Partagé entre HistorialCitasCard.resumenFor (par RDV) et l'onglet Resumen (global).
function findUltimoResumen(notes: PatientNote[] | null): PatientNote | null {
  if (!notes) return null
  return notes.find((n) => n.categoria && RESUMEN_CATEGORIAS.includes(n.categoria)) ?? null
}

// Une photo en attente dans le composeur -- deux provenances possibles : selection locale (file
// present, jamais encore uploadee) ou telephone via QR (photoId present, deja en base avec
// note_id null, jamais re-uploadee -- juste rattachee au moment de "Guardar sesión", cf. prompt
// notas-foto-transfer-qr). localId sert uniquement de clef React stable, jamais envoye au serveur.
interface DraftPhoto {
  localId: string
  file: File | null
  previewUrl: string
  momento: 'antes' | 'despues' | null
  photoId?: string
  createdAt?: string
}

// Un brouillon local tant que la session n'est pas enregistrée -- rien n'est écrit en base ici.
interface DraftSessionEntry {
  categoria: string | null // null = "sin categoría"
  contenido: string
  photos: DraftPhoto[]
  programarRecordatorio?: boolean // uniquement pertinent pour categoria === CATEGORIA_CONTROL
  controlMeses?: number | ''
}

interface ProximoControl {
  fecha: string | null
  meses: number | null
  enviado: boolean
  enviadoAt: string | null
  photoNoteId: string | null
  photoThumbUrl: string | null
}

const CATEGORIA_CONTROL = 'Control' // catégorie réservée, jamais dans categorias_notas
// Verrouillage par inactivité réelle (absence de mouvement souris/clavier/clic) des notas clínicas --
// pas de valeur par organisation pour l'instant, constante nommée pour pouvoir l'ajuster facilement.
const INACTIVITY_LOCK_MS = 10 * 60 * 1000

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

// Date locale (selon la langue d'interface) sans l'heure, utilisée comme clé de regroupement des
// notes du même jour -- intlLocale passe en parametre (fonction pure hors composant, ne peut pas
// appeler useLocale elle-meme).
function fechaKey(createdAt: string, intlLocale: string) {
  return new Date(createdAt).toLocaleDateString(intlLocale, { year: 'numeric', month: 'long', day: 'numeric' })
}

// Regroupe les notes par sesion_id (lien réel en base, pas une approximation par date) : toutes les
// notes d'une même session de saisie sont rattachées au même groupe, peu importe leur position dans
// la liste. Les notes historiques sans sesion_id (créées avant ce champ) restent chacune seules dans
// leur propre groupe -- aucun moyen fiable de savoir lesquelles appartenaient au même rendez-vous,
// donc pas de faux regroupement par date comme avant.
function groupNotesBySesion(notes: PatientNote[]) {
  const groups: { key: string; sesionId: string | null; notes: PatientNote[] }[] = []
  const sesionIndex = new Map<string, number>()
  for (const note of notes) {
    if (note.sesionId) {
      const idx = sesionIndex.get(note.sesionId)
      if (idx !== undefined) {
        groups[idx].notes.push(note)
        continue
      }
      sesionIndex.set(note.sesionId, groups.length)
      groups.push({ key: note.sesionId, sesionId: note.sesionId, notes: [note] })
    } else {
      groups.push({ key: note.id, sesionId: null, notes: [note] })
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

function PillIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 20.5L3.5 13.5a4.95 4.95 0 117-7l7 7a4.95 4.95 0 11-7 7z M7.5 9.5l7 7"
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

function QrCodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path strokeLinecap="round" d="M14.5 14.5h3v3h-3v3h6v-6h-3" />
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

// Écran "verrouillé" réutilisé par NotasClinicasCard et le bloc "Última visita" de Historial de
// citas (Partie 4) -- même pattern visuel, un seul code source.
function LockedTeaser({
  id,
  title,
  desc,
  onUnlock,
  className,
}: {
  id?: string
  title: string
  desc: string
  onUnlock: () => void
  className?: string
}) {
  const t = useTranslations('dashboard.patientDetail')
  return (
    <div id={id} className={className ?? 'max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm'}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-[#6926D2]">
        <LockIcon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="mb-4 mt-1 text-sm text-gray-500">{desc}</p>
      <button
        type="button"
        onClick={onUnlock}
        className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
      >
        {t('desbloquear')}
      </button>
    </div>
  )
}

// Saisie du code à 4 chiffres, réutilisée par NotasClinicasCard et le bloc "Última visita" de
// Historial de citas (Partie 4) -- un seul point d'entrée de déverrouillage (verifyCodigo, détenu
// par le parent PatientDetailView), jamais de second mécanisme qui le contournerait. idPrefix évite
// toute collision d'id entre les deux emplacements possibles (tous deux montés en permanence).
function PinEntryBlock({
  idPrefix,
  title,
  desc,
  onCancel,
  onSubmit,
  loading,
  error,
  className,
}: {
  idPrefix: string
  title: string
  desc: string
  onCancel: () => void
  onSubmit: (pin: string) => Promise<boolean>
  loading: boolean
  error: string | null
  className?: string
}) {
  const t = useTranslations('dashboard.patientDetail')
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = async () => {
    const pin = pinDigits.join('')
    if (pin.length !== 4) {
      setLocalError(t('toastIngresaDigitos'))
      return
    }
    setLocalError(null)
    const ok = await onSubmit(pin)
    if (!ok) setPinDigits(['', '', '', ''])
  }

  return (
    <div id={`${idPrefix}-pin-block`} className={className ?? 'max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm'}>
      <h3 className="mb-1 font-semibold text-gray-800">{title}</h3>
      <p className="mb-4 text-sm text-gray-600">{desc}</p>
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
                document.getElementById(`${idPrefix}-pin-${i + 1}`)?.focus()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !pinDigits[i] && i > 0) {
                document.getElementById(`${idPrefix}-pin-${i - 1}`)?.focus()
              }
            }}
            id={`${idPrefix}-pin-${i}`}
            className="h-14 w-12 rounded-xl border border-gray-200 text-center text-xl font-semibold focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
          />
        ))}
      </div>
      {(localError || error) && <p className="mb-3 text-xs text-red-600">{localError || error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-300"
        >
          {t('cancelar')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="flex-1 rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? '...' : t('confirmar')}
        </button>
      </div>
    </div>
  )
}

function NotasClinicasCard({
  patientId,
  state,
  setState,
  codigo,
  notes,
  setNotes,
  categorias,
  categoriasConFoto,
  alerta,
  setAlerta,
  alertaUpdatedAt,
  setAlertaUpdatedAt,
  proximoControl,
  setProximoControl,
  pinError,
  pinLoading,
  verifyCodigo,
  onLock,
  onSessionCreated,
}: {
  patientId: string
  // État d'authentification partagé avec le bloc "Última visita" de Historial de citas (Partie 4) --
  // un seul point d'entrée de déverrouillage (verifyCodigo, détenu par le parent), jamais de second
  // mécanisme qui le contournerait. Cf. prompt notas-resumen-reorder-historial.
  state: 'locked' | 'pin' | 'unlocked'
  setState: (state: 'locked' | 'pin' | 'unlocked') => void
  codigo: string | null
  notes: PatientNote[]
  setNotes: React.Dispatch<React.SetStateAction<PatientNote[]>>
  categorias: string[]
  categoriasConFoto: string[]
  alerta: string | null
  setAlerta: React.Dispatch<React.SetStateAction<string | null>>
  alertaUpdatedAt: string | null
  setAlertaUpdatedAt: React.Dispatch<React.SetStateAction<string | null>>
  proximoControl: ProximoControl | null
  setProximoControl: React.Dispatch<React.SetStateAction<ProximoControl | null>>
  pinError: string | null
  pinLoading: boolean
  verifyCodigo: (pin: string) => Promise<boolean>
  onLock: () => void
  // Déclenché uniquement à la création d'une TOUTE NOUVELLE session (jamais lors d'un ajout via
  // "Editar") -- déclenche désormais l'offre "¿Generar una prescripción?" avant l'étape guidée
  // "Agregar acto" (cf. prompt notas-resumen-reorder-historial, Partie 5).
  onSessionCreated?: (appointmentId: string | null) => void
}) {
  const t = useTranslations('dashboard.patientDetail')
  const locale = useLocale()
  const intlLocale = INTL_LOCALE[locale] ?? 'es-PE'
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)

  const [editingAlerta, setEditingAlerta] = useState(false)
  const [alertaDraft, setAlertaDraft] = useState('')
  const [confirmingClearAlerta, setConfirmingClearAlerta] = useState(false)

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContenido, setEditingContenido] = useState('')
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const [uploadTargetNoteId, setUploadTargetNoteId] = useState<string | null>(null)
  const [uploadingNoteId, setUploadingNoteId] = useState<string | null>(null)
  // Étape intermédiaire avant l'upload réel d'une photo sur une note déjà existante (pas le
  // composer) -- laisse le temps de proposer le sélecteur optionnel Antes/Después/— avant d'envoyer.
  const [pendingPhotoUpload, setPendingPhotoUpload] = useState<{ noteId: string; file: File; previewUrl: string } | null>(null)
  const [pendingPhotoMomento, setPendingPhotoMomento] = useState<'antes' | 'despues' | null>(null)
  const [confirmingDeletePhoto, setConfirmingDeletePhoto] = useState<{ noteId: string; photoId: string } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bannerDismissed, setBannerDismissed] = useState(false) // dismiss purement local, pas persisté

  // Brouillon de session (composer multi-catégories) -- rien n'est écrit en base tant que
  // "Guardar sesión" n'est pas cliqué. Une seule entrée par catégorie à la fois dans le brouillon ;
  // ouvrir une chip déjà remplie recharge son contenu pour édition.
  const [draftEntries, setDraftEntries] = useState<DraftSessionEntry[]>([])
  const [openCategoria, setOpenCategoria] = useState<string | null | 'none'>('none') // 'none' = aucune chip ouverte
  const [openContenido, setOpenContenido] = useState('')
  const [openPhotos, setOpenPhotos] = useState<DraftPhoto[]>([])
  const [openProgramarRecordatorio, setOpenProgramarRecordatorio] = useState(false)
  const [openControlMeses, setOpenControlMeses] = useState<number | ''>('')
  const [comentarioFinal, setComentarioFinal] = useState('') // libre, optionnel, couvre toute la session
  const [savingSession, setSavingSession] = useState(false)
  const draftFileInputRef = useRef<HTMLInputElement>(null)
  // "Enviar desde el celular" (QR, cf. prompt notas-foto-transfer-qr) -- jeton rattache a l'entree
  // en cours de composition (openCategoria), jamais persiste au-dela d'un changement de categorie.
  const [qrPanelOpen, setQrPanelOpen] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<'pending' | 'expired' | 'cancelled' | null>(null)
  const [qrCreating, setQrCreating] = useState(false)
  const qrPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrSinceRef = useRef<string | null>(null)
  // Bouton "Editar" sur une case déjà sauvegardée (même sans RDV ni "même jour") -- le composer
  // (déjà toujours affiché) sert alors à AJOUTER de nouvelles entrées à cette session existante,
  // jamais à corriger le texte des notes déjà écrites. null = prochaine sauvegarde crée une
  // nouvelle session (comportement normal).
  const [editingSesionId, setEditingSesionId] = useState<string | null>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Prefill depuis le raccourci "+ Agregar nota" de la fiche d'un RDV (voir AppointmentDetailView.tsx)
  // -- même mécanisme que ?addActo=1&appointmentId=... déjà existant pour les actes (Partie 3).
  const appointmentIdParam = searchParams.get('appointmentId')
  const [appointmentIdPrefill, setAppointmentIdPrefill] = useState<string | null>(null)
  useEffect(() => {
    if (searchParams.get('addNota') === '1' && appointmentIdParam) {
      setAppointmentIdPrefill(appointmentIdParam)
    }
  }, [searchParams, appointmentIdParam])

  const lock = useCallback(() => {
    onLock()
    setFiltroCategoria(null)
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
    setPendingPhotoUpload((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setPendingPhotoMomento(null)
    setBannerDismissed(false)
    setDraftEntries([])
    setOpenCategoria('none')
    setOpenContenido('')
    setOpenPhotos([])
    setOpenProgramarRecordatorio(false)
    setOpenControlMeses('')
    setComentarioFinal('')
    setAppointmentIdPrefill(null)
    setEditingSesionId(null)
    stopQrPolling()
    setQrPanelOpen(false)
    setQrToken(null)
    setQrUrl(null)
    setQrDataUrl(null)
    setQrExpiresAt(null)
    setQrStatus(null)
    qrSinceRef.current = null
  }, [onLock])

  // Verrouillage par inactivité réelle (pas sur un simple changement d'onglet) : réinitialise un
  // minuteur à chaque mouvement souris/clavier/clic, verrouille après INACTIVITY_LOCK_MS sans
  // aucune activité. Le verrouillage sur réponse 403 (code PIN invalide détecté en cours de
  // session) reste géré séparément à chaque appel API, inchangé.
  useEffect(() => {
    if (state !== 'unlocked') return
    let timer: ReturnType<typeof setTimeout>
    let lastReset = 0
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(lock, INACTIVITY_LOCK_MS)
    }
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return // throttle -- évite de réinitialiser le minuteur à chaque pixel de mousemove
      lastReset = now
      resetTimer()
    }
    const events = ['mousemove', 'keydown', 'click'] as const
    events.forEach((evt) => document.addEventListener(evt, handleActivity))
    resetTimer()
    return () => {
      clearTimeout(timer)
      events.forEach((evt) => document.removeEventListener(evt, handleActivity))
    }
  }, [state, lock])

  // Ouvre l'éditeur inline d'une chip (catégorie réelle, Control, ou null = "Sin categoría").
  // Recharge le contenu déjà présent dans le brouillon si cette catégorie y est déjà (édition).
  // Arrete le polling et reinitialise le panneau QR -- jamais d'annulation serveur automatique ici
  // (le jeton reste valide 10 min meme sans consommateur, cf. prompt notas-foto-transfer-qr) :
  // seul le bouton "Cancelar" du panneau annule vraiment le jeton.
  const stopQrPolling = () => {
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current)
      qrPollIntervalRef.current = null
    }
  }
  const resetQrState = () => {
    stopQrPolling()
    setQrPanelOpen(false)
    setQrToken(null)
    setQrUrl(null)
    setQrDataUrl(null)
    setQrExpiresAt(null)
    setQrStatus(null)
    qrSinceRef.current = null
  }

  const revokeLocalPreviews = (photos: DraftPhoto[]) => {
    for (const p of photos) {
      if (p.file) URL.revokeObjectURL(p.previewUrl)
    }
  }

  const openChip = (categoria: string | null) => {
    if (openCategoria === categoria) {
      // Même perte silencieuse que ci-dessous si on reclique la même chip pour la refermer --
      // decision de Martin suite au signalement : auto-valider ici aussi.
      confirmEntry()
      closeChip()
      return
    }
    // Auto-valide l'entrée en cours avant de changer de catégorie -- sinon le texte tapé est perdu
    // silencieusement (bug réel signalé par Martin). Même effet que cliquer "Agregar" soi-même ;
    // confirmEntry() ne fait rien si rien n'a été tapé (garde déjà existante).
    confirmEntry()
    const existing = draftEntries.find((e) => e.categoria === categoria)
    setOpenCategoria(categoria)
    setOpenContenido(existing?.contenido ?? '')
    setOpenPhotos(existing?.photos ?? [])
    setOpenProgramarRecordatorio(existing?.programarRecordatorio ?? false)
    setOpenControlMeses(existing?.controlMeses ?? '')
  }

  const closeChip = () => {
    setOpenCategoria('none')
    setOpenContenido('')
    setOpenPhotos([])
    setOpenProgramarRecordatorio(false)
    setOpenControlMeses('')
    resetQrState()
  }

  // Valide l'entrée en cours d'édition et l'ajoute (ou la remplace) dans le brouillon de session --
  // ne ferme pas l'interface, le praticien peut enchaîner immédiatement avec une autre chip.
  const confirmEntry = () => {
    if (openCategoria === 'none' || !openContenido.trim()) return
    const categoria = openCategoria
    setDraftEntries((prev) => [
      ...prev.filter((e) => e.categoria !== categoria),
      {
        categoria,
        contenido: openContenido.trim(),
        photos: openPhotos,
        programarRecordatorio: categoria === CATEGORIA_CONTROL ? openProgramarRecordatorio : undefined,
        controlMeses: categoria === CATEGORIA_CONTROL ? openControlMeses : undefined,
      },
    ])
    closeChip()
  }

  const removeEntry = (categoria: string | null) => {
    setDraftEntries((prev) => {
      const entry = prev.find((e) => e.categoria === categoria)
      if (entry) revokeLocalPreviews(entry.photos)
      return prev.filter((e) => e.categoria !== categoria)
    })
    if (openCategoria === categoria) closeChip()
  }

  const handleDraftFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || openPhotos.length >= MAX_PHOTOS_PER_NOTE) return
    setOpenPhotos((prev) => [
      ...prev,
      { localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, previewUrl: URL.createObjectURL(file), momento: null },
    ])
  }

  const removeOpenPhoto = (localId: string) => {
    setOpenPhotos((prev) => {
      const photo = prev.find((p) => p.localId === localId)
      if (photo?.file) URL.revokeObjectURL(photo.previewUrl)
      return prev.filter((p) => p.localId !== localId)
    })
  }

  const setOpenPhotoMomento = (localId: string, momento: 'antes' | 'despues' | null) => {
    setOpenPhotos((prev) => prev.map((p) => (p.localId === localId ? { ...p, momento } : p)))
  }

  // "Enviar desde el celular" (cf. prompt notas-foto-transfer-qr) -- cree un jeton valide 10 min,
  // puis demarre le polling qui ajoute chaque nouvelle photo recue a openPhotos au fur et a mesure.
  const startQrTransfer = async () => {
    if (!codigo) return
    setQrCreating(true)
    const res = await fetch(`/api/patients/${patientId}/photo-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    const data = await res.json()
    setQrCreating(false)
    if (!res.ok) {
      toast.error(data.error ?? t('toastErrorCrearQr'))
      return
    }
    setQrToken(data.token)
    setQrUrl(data.url)
    setQrExpiresAt(data.expiresAt)
    setQrStatus('pending')
    setQrPanelOpen(true)
    qrSinceRef.current = null
  }

  const cancelQrTransfer = async () => {
    if (qrToken && codigo) {
      await fetch(`/api/patients/${patientId}/photo-transfer/${qrToken}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      }).catch(() => {})
    }
    resetQrState()
  }

  // Polling ~2s tant que le jeton reste 'pending' -- cherche toutes les photos du patient apparues
  // depuis l'ouverture du QR non encore affichees (jamais "la" photo du jeton, plusieurs photos
  // peuvent arriver a la suite sans rescanner, cf. prompt). S'arrete seul une fois le plafond
  // atteint ou le jeton expire/annule.
  useEffect(() => {
    if (!qrToken || qrStatus !== 'pending' || !codigo) return
    const poll = async () => {
      const url = new URL(`/api/patients/${patientId}/photo-transfer/${qrToken}`, window.location.origin)
      if (qrSinceRef.current) url.searchParams.set('since', qrSinceRef.current)
      const res = await fetch(url.toString(), { headers: { 'x-codigo': codigo } })
      if (!res.ok) return
      const data = await res.json()
      setQrStatus(data.status)
      if (data.photos?.length) {
        qrSinceRef.current = data.photos[data.photos.length - 1].createdAt
        setOpenPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.photoId).filter(Boolean))
          const nuevas: DraftPhoto[] = data.photos
            .filter((p: { id: string }) => !existingIds.has(p.id))
            .map((p: { id: string; url: string | null; createdAt: string; momento: 'antes' | 'despues' | null }) => ({
              localId: `remote-${p.id}`,
              file: null,
              previewUrl: p.url ?? '',
              momento: p.momento,
              photoId: p.id,
              createdAt: p.createdAt,
            }))
          const combined = [...prev, ...nuevas].slice(0, MAX_PHOTOS_PER_NOTE)
          return combined
        })
      }
    }
    poll()
    qrPollIntervalRef.current = setInterval(poll, 2000)
    return () => {
      if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken, qrStatus])

  // Arrete le polling une fois le plafond atteint -- plus rien a recevoir pour cette entree.
  useEffect(() => {
    if (openPhotos.length >= MAX_PHOTOS_PER_NOTE) stopQrPolling()
  }, [openPhotos.length])

  // Genere l'image QR cote client (data URL) a partir de l'URL publique -- jamais de service tiers.
  useEffect(() => {
    if (!qrUrl) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(qrUrl, { width: 220, margin: 1 }).then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
    })
    return () => {
      cancelled = true
    }
  }, [qrUrl])

  // Enregistre toute la session de saisie en une fois : un seul POST pour le lot de notes
  // (sesion_id partagé généré côté serveur), puis upload des photos associées note par note en
  // réutilisant l'endpoint existant (séquence fiable, erreurs individuelles rapportées sans faire
  // échouer tout le lot déjà sauvegardé). Le rappel "próximo control" reprend exactement la logique
  // existante : déclenché dès qu'une entrée "Control" est présente, peu importe le reste du lot.
  const saveSession = async () => {
    if (draftEntries.length === 0 || !codigo) return
    setSavingSession(true)
    setLoading(true)
    // editingSesionId (bouton "Editar" sur une case déjà sauvegardée) a priorité absolue côté
    // serveur sur tout appointmentId -- envoyé en plus, jamais à sa place, au cas où le serveur en
    // aurait besoin pour d'autres usages futurs, mais c'est bien sesionId qui tranche.
    const editandoSesionExistante = editingSesionId !== null
    const res = await fetch(`/api/patients/${patientId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo,
        entradas: draftEntries.map((e) => ({
          contenido: e.contenido,
          categoria: e.categoria,
          // Photos deja envoyees depuis le telephone (QR) et deja en base avec note_id null --
          // rattachees cote serveur dans ce meme PUT, jamais re-uploadees ici.
          photoIds: e.photos.filter((p) => p.photoId).map((p) => p.photoId),
        })),
        comentarioFinal: comentarioFinal.trim() || null,
        appointmentId: appointmentIdPrefill ?? undefined,
        sesionId: editingSesionId ?? undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? t('toastErrorGuardarNota'))
      if (res.status === 403) lock()
      // Sesión introuvable (id invalide/perimé) -- revenir au mode "nouvelle session" plutôt que de
      // rester bloqué à retenter indéfiniment contre un id qui n'existe plus.
      if (res.status === 404) setEditingSesionId(null)
      setSavingSession(false)
      setLoading(false)
      return
    }

    const sesionId: string | null = data.sesionId ?? null
    const sesionComentarioFinal: string | null = data.comentarioFinal ?? null
    // appointmentId résolu côté serveur (prefill explicite OU déduit d'un unique RDV du jour même) --
    // reflète fidèlement ce qui a réellement été enregistré, même quand le client n'avait rien fourni.
    const resolvedAppointmentId: string | null = data.appointmentId ?? null
    const createdNotes: PatientNote[] = (data.notes as Array<Omit<PatientNote, 'sesionId' | 'comentarioFinal' | 'appointmentId' | 'photos'>>).map(
      (n) => ({
        ...n,
        sesionId,
        comentarioFinal: sesionComentarioFinal,
        appointmentId: resolvedAppointmentId,
        photos: [],
      })
    )

    const photoErrorCategorias: string[] = []
    for (let i = 0; i < draftEntries.length; i++) {
      const entry = draftEntries[i]
      const noteId = createdNotes[i]?.id
      if (!noteId || entry.photos.length === 0) continue
      const resolvedPhotos: PatientNotePhoto[] = []
      for (const photo of entry.photos) {
        if (photo.file) {
          // Selection locale depuis l'ordinateur -- chemin existant inchange.
          const formData = new FormData()
          formData.append('codigo', codigo)
          formData.append('file', photo.file)
          if (photo.momento) formData.append('momento', photo.momento)
          const photoRes = await fetch(`/api/patients/${patientId}/notes/${noteId}/photos`, {
            method: 'POST',
            body: formData,
          })
          if (photoRes.ok) {
            const photoData = await photoRes.json()
            resolvedPhotos.push(photoData.photo)
          } else {
            photoErrorCategorias.push(entry.categoria ?? t('sinCategoria'))
          }
          URL.revokeObjectURL(photo.previewUrl)
        } else if (photo.photoId) {
          // Deja en base (telephone, QR) et deja rattachee par le PUT ci-dessus -- juste refleter
          // l'etat local, jamais de nouvel upload.
          resolvedPhotos.push({
            id: photo.photoId,
            url: photo.previewUrl,
            created_at: photo.createdAt ?? new Date().toISOString(),
            momento: photo.momento,
          })
        }
      }
      createdNotes[i].photos = resolvedPhotos
    }

    setNotes((prev) => [...createdNotes, ...prev])

    // Reprend exactement la logique de relance existante -- déclenchée indépendamment du nombre
    // d'autres catégories envoyées dans le même lot.
    const controlEntry = draftEntries.find((e) => e.categoria === CATEGORIA_CONTROL)
    if (controlEntry && controlEntry.programarRecordatorio && controlEntry.controlMeses !== '') {
      // Cherche d'abord dans le lot qui vient d'être créé (ses photos sont déjà uploadées à ce stade,
      // cf. boucle ci-dessus) -- sinon dans l'historique déjà chargé, pour couvrir le cas où la photo
      // pertinente provient d'une session précédente et non du lot courant.
      const diagnosticoConFoto =
        createdNotes.find((n) => n.categoria === 'Diagnóstico' && (n.photos?.length ?? 0) > 0) ??
        notes.find((n) => n.categoria === 'Diagnóstico' && (n.photos?.length ?? 0) > 0)
      const patchRes = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proximo_control_meses: controlEntry.controlMeses,
          proximo_control_photo_note_id: diagnosticoConFoto?.id ?? null,
          proximo_control_sesion_id: sesionId,
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
        toast.success(t('toastControlProgramado'))
      } else {
        toast.error(t('toastNotaGuardadaSinRecordatorio'))
      }
    } else if (photoErrorCategorias.length === 0) {
      toast.success(t('toastSesionGuardada'))
    }

    if (photoErrorCategorias.length > 0) {
      toast.error(t('toastErrorSubirAlgunasFotos', { categorias: photoErrorCategorias.join(', ') }))
    }

    // Étape guidée "Agregar acto" (Partie C) -- uniquement à la création d'une TOUTE NOUVELLE
    // session, jamais lors d'un ajout via "Editar" sur une case déjà traitée.
    if (!editandoSesionExistante) {
      onSessionCreated?.(resolvedAppointmentId)
    }

    setDraftEntries([])
    setComentarioFinal('')
    setAppointmentIdPrefill(null)
    setEditingSesionId(null)
    closeChip()
    setSavingSession(false)
    setLoading(false)
  }

  // Bouton "Editar" sur une case déjà sauvegardée (même jours après sa création) -- vide le
  // composer (jamais de préremplissage du texte des notes passées, on ajoute, on ne corrige pas
  // l'historique) et retient l'id de la session cible pour que saveSession() y fusionne la suite.
  const startEditSession = (sesionId: string) => {
    setDraftEntries([])
    setComentarioFinal('')
    closeChip()
    setEditingSesionId(sesionId)
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, ...data.note } : n)))
      toast.success(t('toastNotaActualizada'))
      cancelEditNote()
    } else {
      toast.error(data.error ?? t('toastErrorActualizarNota'))
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
      toast.success(t('toastNotaEliminada'))
      setConfirmingDeleteId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? t('toastErrorEliminarNota'))
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const openFilePicker = (noteId: string) => {
    setUploadTargetNoteId(noteId)
    fileInputRef.current?.click()
  }

  // Ne lance pas l'upload tout de suite -- laisse d'abord choisir le tag optionnel Antes/Después/—
  // (voir pendingPhotoUpload ci-dessous), affiché juste sous la note concernée.
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const noteId = uploadTargetNoteId
    e.target.value = '' // permet de re-sélectionner le même fichier ensuite
    if (!file || !noteId) return
    setPendingPhotoUpload({ noteId, file, previewUrl: URL.createObjectURL(file) })
    setPendingPhotoMomento(null)
    setUploadTargetNoteId(null)
  }

  const cancelPendingPhotoUpload = () => {
    if (pendingPhotoUpload) URL.revokeObjectURL(pendingPhotoUpload.previewUrl)
    setPendingPhotoUpload(null)
    setPendingPhotoMomento(null)
  }

  const confirmPendingPhotoUpload = async () => {
    if (!pendingPhotoUpload || !codigo) return
    const { noteId, file, previewUrl } = pendingPhotoUpload
    setUploadingNoteId(noteId)
    const formData = new FormData()
    formData.append('codigo', codigo)
    formData.append('file', file)
    if (pendingPhotoMomento) formData.append('momento', pendingPhotoMomento)
    const res = await fetch(`/api/patients/${patientId}/notes/${noteId}/photos`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (res.ok) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, photos: [...(n.photos ?? []), data.photo] } : n))
      )
      toast.success(t('toastFotoAgregada'))
    } else {
      toast.error(data.error ?? t('toastErrorSubirFoto'))
      if (res.status === 403) lock()
    }
    URL.revokeObjectURL(previewUrl)
    setPendingPhotoUpload(null)
    setPendingPhotoMomento(null)
    setUploadingNoteId(null)
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
      toast.success(t('toastFotoEliminada'))
      setConfirmingDeletePhoto(null)
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? t('toastErrorEliminarFoto'))
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
      toast.success(t('toastAlertaGuardada'))
    } else {
      toast.error(data.error ?? t('toastErrorGuardarAlerta'))
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
      toast.success(t('toastAlertaEliminada'))
    } else {
      toast.error(data.error ?? t('toastErrorEliminarAlerta'))
      if (res.status === 403) lock()
    }
    setLoading(false)
  }

  const filteredNotes = filtroCategoria ? notes.filter((n) => n.categoria === filtroCategoria) : notes

  function allowsPhoto(categoria: string | null) {
    if (!categoria) return false
    return categoriasConFoto.includes(categoria)
  }

  // Catégories déjà utilisées aujourd'hui -- bornage "une entrée par catégorie par jour" (pas de 10 000 entrées).
  const todayKey = fechaKey(new Date().toISOString(), intlLocale)
  const categoriasUtiliseesAujourdhui = new Set(
    notes.filter((n) => fechaKey(n.created_at, intlLocale) === todayKey && n.categoria).map((n) => n.categoria as string)
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
                <img src={photo.url} alt={t('fotoClinicaAlt')} className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400">
                <PhotoIcon className="h-5 w-5" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfirmingDeletePhoto({ noteId: note.id, photoId: photo.id })}
              aria-label={t('eliminarFotoLabel')}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white opacity-0 transition-opacity group-hover/photo:opacity-100"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_NOTE && pendingPhotoUpload?.noteId !== note.id && (
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
                <span className="text-[9px]">{t('masFoto')}</span>
              </>
            )}
          </button>
        )}
        {pendingPhotoUpload?.noteId === note.id && (
          <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPhotoUpload.previewUrl} alt={t('fotoClinicaAlt')} className="h-full w-full object-cover" />
            </div>
            <select
              value={pendingPhotoMomento ?? ''}
              onChange={(e) => setPendingPhotoMomento(e.target.value === 'antes' || e.target.value === 'despues' ? e.target.value : null)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
            >
              <option value="">{t('momentoSinTag')}</option>
              <option value="antes">{t('momentoAntes')}</option>
              <option value="despues">{t('momentoDespues')}</option>
            </select>
            <button
              type="button"
              onClick={cancelPendingPhotoUpload}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              {t('cancelar')}
            </button>
            <button
              type="button"
              onClick={confirmPendingPhotoUpload}
              disabled={uploadingNoteId === note.id}
              className="rounded-lg bg-[#6926D2] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
            >
              {uploadingNoteId === note.id ? '...' : t('subirFotoLabel')}
            </button>
          </div>
        )}
        {confirmingDeletePhoto?.noteId === note.id && (
          <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs">
            <span className="text-gray-600">{t('confirmarEliminarFoto')}</span>
            <button
              type="button"
              onClick={() => setConfirmingDeletePhoto(null)}
              className="font-medium text-gray-500 hover:text-gray-700"
            >
              {t('cancelar')}
            </button>
            <button
              type="button"
              onClick={() => confirmDeletePhoto(note.id, confirmingDeletePhoto.photoId)}
              disabled={loading}
              className="font-medium text-red-600 hover:text-red-700"
            >
              {t('confirmar')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Rendu d'une note individuelle (vue + édition), partagé entre les groupes "session" (cadre fort,
  // un seul en-tête, hideDate) et les notes historiques sans sesion_id (chacune dans son propre cadre).
  const renderNoteItem = (note: PatientNote, opts?: { hideDate?: boolean }) => (
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
              <option value="">{t('sinCategoria')}</option>
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
              {t('cancelar')}
            </button>
            <button
              type="button"
              onClick={saveEditNote}
              disabled={loading || !editingContenido.trim()}
              className="flex-1 rounded-lg bg-[#6926D2] py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
            >
              {t('guardar')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!opts?.hideDate && (
                <p className="text-xs text-gray-400">
                  {new Date(note.created_at).toLocaleString(intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
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
                aria-label={t('editarNotaLabel')}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(note.id)}
                aria-label={t('eliminarNotaLabel')}
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
              <p className="text-xs text-gray-600">{t('confirmarEliminarNota')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {t('cancelar')}
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteNote(note.id)}
                  disabled={loading}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  {t('confirmar')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  if (state === 'locked') {
    return (
      <LockedTeaser
        id="notas-locked-teaser"
        title={t('notasConfidencialesTitle')}
        desc={t('notasConfidencialesDesc')}
        onUnlock={() => setState('pin')}
      />
    )
  }

  if (state === 'pin') {
    return (
      <PinEntryBlock
        idPrefix="notas"
        title={t('notasConfidencialesTitle')}
        desc={t('ingresaCodigoSeguridad')}
        onCancel={() => setState('locked')}
        onSubmit={verifyCodigo}
        loading={pinLoading}
        error={pinError}
      />
    )
  }

  return (
    <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={draftFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleDraftFileSelected}
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
            aria-label={t('cerrarLabel')}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt={t('fotoClinicaAlt')} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <NotesIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{t('notasClinicas')}</h3>
            <p className="text-xs text-gray-400">{t('accesoAutenticado')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={lock}
          aria-label={t('bloquearNotasLabel')}
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
                    {t('actualizadoEl', { date: new Date(alertaUpdatedAt).toLocaleDateString(intlLocale) })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={startEditAlerta}
                aria-label={t('editarAlertaLabel')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClearAlerta(true)}
                aria-label={t('eliminarAlertaLabel')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {confirmingClearAlerta && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
              <p className="text-xs text-amber-800">{t('confirmarEliminarAlerta')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingClearAlerta(false)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {t('cancelar')}
                </button>
                <button
                  type="button"
                  onClick={clearAlerta}
                  disabled={loading}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  {t('confirmar')}
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
          {t('agregarAlertaClinica')}
        </button>
      )}

      {editingAlerta && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-amber-800" htmlFor="alerta-draft">
              {t('alertaClinicaLabel')}
            </label>
            <span className="text-xs text-amber-600">{alertaDraft.length}/300</span>
          </div>
          <textarea
            id="alerta-draft"
            value={alertaDraft}
            onChange={(e) => setAlertaDraft(e.target.value.slice(0, 300))}
            rows={2}
            placeholder={t('alertaClinicaPlaceholder')}
            className="w-full resize-none rounded-lg border border-amber-200 bg-white p-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setEditingAlerta(false)}
              className="flex-1 rounded-lg border border-amber-200 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {t('cancelar')}
            </button>
            <button
              type="button"
              onClick={saveAlerta}
              disabled={loading}
              className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {t('guardar')}
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
              <img src={proximoControl.photoThumbUrl} alt={t('fotoDiagnosticoAsociada')} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs font-semibold text-orange-800">
              {proximoControl.photoThumbUrl ? t('fotoDiagnosticoAsociada') : t('controlProgramado')}
            </p>
            <p className="text-xs text-orange-600">
              {new Date(proximoControl.fecha).toLocaleDateString(intlLocale)}
              {proximoControl.meses ? ` · ${t('proximoControlDentroDe', { months: proximoControl.meses })}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label={t('ocultarLabel')}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-orange-400 hover:bg-orange-100"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filtro par catégorie -- menu déroulant plutôt que des chips colorées (Partie 2 : évitait un
          doublon visuel avec la ligne de sélection du composer juste en dessous, sans texte explicatif). */}
      {(categorias.length > 0 || notes.some((n) => n.categoria === CATEGORIA_CONTROL)) && (
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="filtro-categoria" className="text-xs text-gray-500">
            {t('filtrarPorLabel')}
          </label>
          <select
            id="filtro-categoria"
            value={filtroCategoria ?? ''}
            onChange={(e) => setFiltroCategoria(e.target.value || null)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
          >
            <option value="">{t('todas')}</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            {notes.some((n) => n.categoria === CATEGORIA_CONTROL) && (
              <option value={CATEGORIA_CONTROL}>{t('controlBadge')}</option>
            )}
          </select>
        </div>
      )}

      <div className="mb-4 max-h-96 space-y-4 overflow-y-auto">
        {filteredNotes.length === 0 && <p className="py-4 text-center text-sm text-gray-400">{t('sinNotasRegistradas')}</p>}
        {groupNotesBySesion(filteredNotes).map((group) =>
          group.sesionId ? (
            // Session réelle (sesion_id partagé) : cadre visuellement fort, un seul en-tête de date/heure.
            <div
              key={group.key}
              className={`rounded-xl border-2 p-3 ${
                editingSesionId === group.sesionId ? 'border-[#6926D2] bg-violet-100/60' : 'border-[#6926D2]/40 bg-violet-50/40'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6926D2]">
                  {new Date(group.notes[0].created_at).toLocaleString(intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}
                  {t('entradasCount', { count: group.notes.length })}
                </p>
                <button
                  type="button"
                  onClick={() => startEditSession(group.sesionId as string)}
                  aria-label={t('editarSesionLabel')}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#6926D2] hover:bg-white/60"
                >
                  <PencilIcon className="h-3 w-3" />
                  {t('editarSesionLabel')}
                </button>
              </div>
              <div className="space-y-2">{group.notes.map((note) => renderNoteItem(note, { hideDate: true }))}</div>
              {group.notes[0].comentarioFinal && (
                <p className="mt-3 rounded-lg bg-white/60 p-2.5 text-sm italic text-gray-600">
                  {group.notes[0].comentarioFinal}
                </p>
              )}
            </div>
          ) : (
            // Note historique sans sesion_id : pas de regroupement approximatif par date, cadre individuel.
            <div key={group.key}>{group.notes.map((note) => renderNoteItem(note))}</div>
          )
        )}
      </div>

      <div ref={composerRef}>
        {editingSesionId && (
          <p className="mb-1.5 flex items-center justify-between rounded-lg bg-violet-100/60 px-2.5 py-1.5 text-xs text-[#6926D2]">
            {t('editandoSesionHint')}
            <button type="button" onClick={() => setEditingSesionId(null)} className="font-medium underline">
              {t('cancelar')}
            </button>
          </p>
        )}
        {appointmentIdPrefill && <p className="mb-1.5 text-xs text-gray-500">{t('vinculadoCita')}</p>}
        <p className="mb-1.5 text-xs text-gray-500">{t('composerHint')}</p>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {categorias.map((cat) => {
          const dejaUtilisee = categoriasUtiliseesAujourdhui.has(cat)
          const filled = draftEntries.some((e) => e.categoria === cat)
          const isOpen = openCategoria === cat
          return (
            <button
              key={cat}
              type="button"
              disabled={dejaUtilisee}
              onClick={() => openChip(cat)}
              title={dejaUtilisee ? t('yaHayEntradaCategoria') : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(cat)} ${
                isOpen
                  ? 'ring-2 ring-[#6926D2]'
                  : filled
                    ? `ring-2 ${categoryRingColor(cat)}`
                    : dejaUtilisee
                      ? 'opacity-30'
                      : ''
              }`}
            >
              {filled && !isOpen ? '✓ ' : ''}
              {cat}
            </button>
          )
        })}
        {!categoriasUtiliseesAujourdhui.has(CATEGORIA_CONTROL) && (
          <button
            type="button"
            onClick={() => openChip(CATEGORIA_CONTROL)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${categoryColor(CATEGORIA_CONTROL)} ${
              openCategoria === CATEGORIA_CONTROL
                ? 'ring-2 ring-[#6926D2]'
                : draftEntries.some((e) => e.categoria === CATEGORIA_CONTROL)
                  ? 'ring-2 ring-orange-400'
                  : ''
            }`}
          >
            {draftEntries.some((e) => e.categoria === CATEGORIA_CONTROL) && openCategoria !== CATEGORIA_CONTROL ? '✓ ' : ''}
            {t('controlBadge')}
          </button>
        )}
        <button
          type="button"
          onClick={() => openChip(null)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            openCategoria === null
              ? 'bg-[#6926D2] text-white ring-2 ring-[#6926D2]'
              : draftEntries.some((e) => e.categoria === null)
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          {draftEntries.some((e) => e.categoria === null) && openCategoria !== null ? '✓ ' : ''}
          {t('sinCategoria')}
        </button>
      </div>

      {openCategoria !== 'none' && (
        <div className="mb-3 rounded-xl border border-[#6926D2]/30 bg-violet-50/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">
              {openCategoria === CATEGORIA_CONTROL ? t('controlBadge') : openCategoria ?? t('sinCategoria')}
            </span>
            <span className="text-xs text-gray-400">{openContenido.length}/500</span>
          </div>
          <textarea
            value={openContenido}
            onChange={(e) => setOpenContenido(e.target.value.slice(0, 500))}
            rows={3}
            placeholder={t('observacionPlaceholder')}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2.5 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
          />

          {allowsPhoto(openCategoria) && (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                {openPhotos.map((photo) => (
                  <div key={photo.localId} className="flex flex-col items-center gap-1">
                    <div className="group/photo relative h-14 w-14 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={t('fotoClinicaAlt')}
                        className="h-full w-full rounded-lg border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeOpenPhoto(photo.localId)}
                        aria-label={t('eliminarFotoLabel')}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </div>
                    <select
                      value={photo.momento ?? ''}
                      onChange={(e) =>
                        setOpenPhotoMomento(photo.localId, e.target.value === 'antes' || e.target.value === 'despues' ? e.target.value : null)
                      }
                      className="w-14 rounded-lg border border-gray-200 bg-white px-1 py-1 text-[10px] text-gray-600 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                    >
                      <option value="">{t('momentoSinTag')}</option>
                      <option value="antes">{t('momentoAntes')}</option>
                      <option value="despues">{t('momentoDespues')}</option>
                    </select>
                  </div>
                ))}
                {openPhotos.length < MAX_PHOTOS_PER_NOTE && (
                  <>
                    <button
                      type="button"
                      onClick={() => draftFileInputRef.current?.click()}
                      className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-[#6926D2] hover:text-[#6926D2]"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      <span className="text-[9px]">{t('masFoto')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={startQrTransfer}
                      disabled={qrCreating}
                      title={t('enviarDesdeCelularLabel')}
                      className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-[#6926D2] hover:text-[#6926D2] disabled:opacity-50"
                    >
                      <QrCodeIcon className="h-4 w-4" />
                      <span className="text-[9px]">{t('qrLabel')}</span>
                    </button>
                  </>
                )}
              </div>
              {openPhotos.length >= MAX_PHOTOS_PER_NOTE && (
                <p className="mt-1.5 text-[11px] text-gray-400">{t('plafondFotosAlcanzado', { max: MAX_PHOTOS_PER_NOTE })}</p>
              )}

              {qrPanelOpen && (
                <div className="mt-2 rounded-lg border border-[#6926D2]/30 bg-white p-3">
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-2.5 py-2 text-[11px] text-warning-700">
                    <WarningIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <p>{t('avisoConexionInternet')}</p>
                  </div>
                  {qrStatus === 'pending' && qrDataUrl && (
                    <div className="flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt={t('qrLabel')} className="h-40 w-40" />
                      <p className="text-center text-[11px] text-gray-500">{t('escaneaQrHint')}</p>
                      {qrExpiresAt && (
                        <p className="text-center text-[10px] text-gray-400">
                          {t('qrValidoHastaLabel', { time: new Date(qrExpiresAt).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) })}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={cancelQrTransfer}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        {t('cancelar')}
                      </button>
                    </div>
                  )}
                  {qrStatus === 'expired' && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-gray-500">{t('qrExpiradoHint')}</p>
                      <button
                        type="button"
                        onClick={startQrTransfer}
                        className="rounded-lg bg-[#6926D2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0]"
                      >
                        {t('qrNuevoLabel')}
                      </button>
                    </div>
                  )}
                  {qrStatus === 'cancelled' && <p className="text-center text-xs text-gray-500">{t('qrCanceladoHint')}</p>}
                </div>
              )}
            </div>
          )}

          {openCategoria === CATEGORIA_CONTROL && (
            <div className="mt-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-3">
              <label className="flex items-center gap-2 text-xs font-medium text-orange-800">
                <input
                  type="checkbox"
                  checked={openProgramarRecordatorio}
                  onChange={(e) => setOpenProgramarRecordatorio(e.target.checked)}
                />
                {t('programarRecordatorioAutomatico')}
              </label>
              {openProgramarRecordatorio && (
                <select
                  value={openControlMeses}
                  onChange={(e) => setOpenControlMeses(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="mt-2 w-full rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-orange-400 focus:outline-none"
                >
                  <option value="">{t('elegirEllipsis')}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {t('elegirMesesOption', { months: m })}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1.5 text-[11px] text-orange-500">
                {openProgramarRecordatorio ? t('emailAutomaticoInfo') : t('dejaloSinMarcar')}
              </p>
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={closeChip}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {t('cancelar')}
            </button>
            {draftEntries.some((e) => e.categoria === openCategoria) && (
              <button
                type="button"
                onClick={() => removeEntry(openCategoria === 'none' ? null : openCategoria)}
                className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                {t('quitarEntrada')}
              </button>
            )}
            <button
              type="button"
              onClick={confirmEntry}
              disabled={!openContenido.trim()}
              className="flex-1 rounded-lg bg-[#6926D2] py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
            >
              {t('agregarEntrada')}
            </button>
          </div>
        </div>
      )}

      {draftEntries.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600" htmlFor="comentario-final">
              {t('comentarioFinalLabel')}
            </label>
            <span className="text-xs text-gray-400">{comentarioFinal.length}/500</span>
          </div>
          <textarea
            id="comentario-final"
            value={comentarioFinal}
            onChange={(e) => setComentarioFinal(e.target.value.slice(0, 500))}
            rows={2}
            placeholder={t('comentarioFinalPlaceholder')}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2.5 text-sm focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
          />
        </div>
      )}

      <button
        type="button"
        onClick={saveSession}
        disabled={loading || draftEntries.length === 0}
        className="mt-1 w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
      >
        {savingSession ? '...' : t('guardarSesion')}
      </button>
    </div>
  )
}

const STATUS_BADGE = {
  pendiente: 'warning',
  confirmado: 'info',
  en_curso: 'brand',
  pagado: 'success',
  anulado: 'error',
} as const

const STATUS_LABEL_KEY: Record<string, string> = {
  pendiente: 'statutPendiente',
  confirmado: 'statutConfirmado',
  en_curso: 'statutEnCurso',
  pagado: 'statutPagado',
  anulado: 'statutAnulado',
}

// Prefixees par ! (important) : le parent "divide-y divide-gray-50" genere une regle
// composite (.divide-gray-50 > :not([hidden]) ~ :not([hidden])) de specificite plus
// elevee qu'une simple classe et fixe border-color (shorthand 4 cotes) sur chaque ligne
// sauf la premiere -- sans !important elle ecrase silencieusement border-l-*-400 ici.
const STATUS_BORDER = {
  pendiente: '!border-l-warning-400',
  // Pas de token "info-400" dans le design system -- bleu Tailwind brut, meme principe que
  // Badge.tsx (info: 'bg-blue-50 text-blue-700'), pour rester coherent avec le badge ci-dessus.
  confirmado: '!border-l-blue-400',
  en_curso: '!border-l-brand-400',
  pagado: '!border-l-success-400',
  anulado: '!border-l-error-400',
} as const

export function PatientNotFound() {
  const t = useTranslations('dashboard.patientDetail')
  return <div className="text-error-600">{t('notFound')}</div>
}

interface ActoCatalogo {
  id: string
  nombre: string
  precioDefault: number | null
}

interface ActoHistorial {
  id: string
  monto: number
  fecha: string
  appointmentId: string | null
  nombre: string
  // null pour les lignes origen === 'mercadopago' (paiement automatique, jamais saisi a la main).
  metodoPago: 'efectivo' | 'transferencia' | 'otro' | null
  // 'mercadopago' = fusionne depuis appointments.statut='pagado' (voir GET /api/patients/[id]/actos) --
  // jamais editable/supprimable, contrairement aux lignes 'acto' saisies via ce formulaire.
  origen: 'acto' | 'mercadopago'
}

// Regroupe l'historique par date exacte (affichage uniquement, cf. prompt
// panier-manual-regroupement-fecha) -- historial est deja trie du plus recent au plus ancien par
// l'API, donc les entrees d'une meme date sont forcement contigues : un simple regroupement par
// premiere occurrence suffit, jamais besoin de re-trier.
function groupHistorialByFecha(historial: ActoHistorial[]): { fecha: string; items: ActoHistorial[]; total: number }[] {
  const groups: { fecha: string; items: ActoHistorial[]; total: number }[] = []
  const index = new Map<string, number>()
  for (const h of historial) {
    const idx = index.get(h.fecha)
    if (idx !== undefined) {
      groups[idx].items.push(h)
      groups[idx].total += h.monto
      continue
    }
    index.set(h.fecha, groups.length)
    groups.push({ fecha: h.fecha, items: [h], total: h.monto })
  }
  return groups
}

// Une ligne du panier d'actes -- seul formulaire de ActosRealizadosCard, que l'ouverture vienne du
// bouton manuel "+ Agregar acto" ou de l'etape guidee post-validation de note (cf. prompt
// panier-manual-regroupement-fecha). `guided` distingue seulement le prefill initial, la banniere
// d'avertissement et le libelle du bouton d'abandon -- jamais la structure du formulaire lui-meme.
interface LineaActo {
  localId: string
  mode: 'catalogo' | 'nuevo' | 'libre'
  actoId: string
  nombreLibre: string
  monto: string
  metodoPago: 'efectivo' | 'transferencia' | 'otro'
  error: string | null
}

function emptyLineaActo(): LineaActo {
  return {
    localId: `linea-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mode: 'catalogo',
    actoId: '',
    nombreLibre: '',
    monto: '',
    metodoPago: 'efectivo',
    error: null,
  }
}

// Donnee de facturation (base du Pareto 80/20 dans Analisis), volontairement separee des Notas
// clinicas ci-dessus : pas de PIN, pas de confidentialite particuliere.
function ActosRealizadosCard({
  patientId,
  onHistorialChange,
  autoOpenRequest,
  appointments,
  monnaie,
}: {
  patientId: string
  onHistorialChange?: (historial: ActoHistorial[]) => void
  // "Acciones rápidas" (onglet Resumen, bouton "Agregar acto") ET étape guidée post-validation de
  // note (Partie C, cf. prompt notas-una-case-por-visita) partagent ce même mécanisme one-shot par
  // nonce -- `guided` distingue les deux pour n'activer le comportement "quasi-obligatoire avec
  // avertissement" que dans le second cas, jamais pour le bouton manuel/Acciones rápidas.
  autoOpenRequest?: { nonce: number; appointmentId: string | null; guided: boolean } | null
  // Déjà chargés par le parent (page.tsx) -- réutilisés ici pour afficher "ya pagado por
  // MercadoPago" sans dupliquer une requête déjà faite ailleurs sur la page.
  appointments: AppointmentRow[]
  monnaie: string
}) {
  const t = useTranslations('dashboard.patientDetail')
  // Reutilise les libelles deja traduits de la carte Ingresos (medios de pago + badge
  // "MercadoPago") plutot que de dupliquer la traduction, cf. prompt fusion ingresos/fiche patient.
  const tIngresos = useTranslations('dashboard.ingresos')
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [catalogo, setCatalogo] = useState<ActoCatalogo[]>([])
  const [historial, setHistorial] = useState<ActoHistorial[]>([])

  const [showForm, setShowForm] = useState(false)
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  // Etape guidee post-validation de note (Partie C) : "Cancelar" devient "Omitir esta vez" avec
  // avertissement, et la premiere ligne du panier est prefillee avec "Consulta..." si disponible --
  // jamais pour le bouton manuel "+ Agregar acto" (panier vide, une ligne a blanc au depart).
  const [guided, setGuided] = useState(false)
  // Panier d'actes -- seul formulaire, partage par le bouton manuel et l'etape guidee (cf. prompt
  // panier-manual-regroupement-fecha).
  const [lineasActos, setLineasActos] = useState<LineaActo[]>([])
  // Nonce en attente d'initialisation du panier -- attend que le catalogue soit charge (loading)
  // avant de chercher l'acte "Consulta..." par prefixe, pour ne jamais initialiser un panier vide a
  // tort si le mode guide se declenche avant la fin du chargement initial du catalogue.
  const [pendingGuidedBasketNonce, setPendingGuidedBasketNonce] = useState<number | null>(null)

  const appointmentIdParam = searchParams.get('appointmentId')
  const [appointmentIdPrefill, setAppointmentIdPrefill] = useState<string | null>(null)

  // Transmet au parent (PatientDetailView) l'historique des actes réalisés -- consommé par Historial
  // de citas (Partie 4) pour afficher les actes de la session dans la modale de détail d'un RDV.
  // Uniquement les actes saisis a la main (origen 'acto') : les paiements MercadoPago fusionnes
  // dans cette carte n'ont pas leur place sous "Actos realizados" de la modale d'un RDV, feature
  // distincte jamais demandee par ce prompt.
  useEffect(() => {
    onHistorialChange?.(historial.filter((h) => h.origen === 'acto'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/actos`)
    if (res.ok) {
      const data = await res.json()
      setCatalogo(data.catalogo ?? [])
      setHistorial(data.historial ?? [])
    }
    setLoading(false)
  }, [patientId])

  useEffect(() => {
    load()
  }, [load])

  // Ouverture automatique prefillee quand on arrive depuis le raccourci "+ Agregar acto" de la
  // fiche d'un RDV (voir AppointmentDetailView.tsx) -- ?addActo=1&appointmentId=... -- panier avec
  // une seule ligne a blanc, jamais le prefill "Consulta..." reserve au mode guide.
  useEffect(() => {
    if (searchParams.get('addActo') === '1') {
      setShowForm(true)
      setAppointmentIdPrefill(appointmentIdParam)
      setGuided(false)
      setLineasActos([emptyLineaActo()])
    }
  }, [searchParams, appointmentIdParam])

  // "Acciones rápidas" (onglet Resumen, bouton "Agregar acto") ET étape guidée post-validation de
  // note (Partie C) partagent ce même mécanisme one-shot par nonce -- pas de PIN ici donc pas
  // besoin d'attendre un état.
  const handledAutoOpenFormNonceRef = useRef(0)
  useEffect(() => {
    if (!autoOpenRequest) return
    if (handledAutoOpenFormNonceRef.current === autoOpenRequest.nonce) return
    handledAutoOpenFormNonceRef.current = autoOpenRequest.nonce
    setShowForm(true)
    setAppointmentIdPrefill(autoOpenRequest.appointmentId)
    setGuided(autoOpenRequest.guided)
    if (autoOpenRequest.guided) {
      setPendingGuidedBasketNonce(autoOpenRequest.nonce)
    } else {
      setLineasActos([emptyLineaActo()])
    }
  }, [autoOpenRequest])

  // Initialise le panier avec une premiere ligne "Consulta..." (recherche explicite par prefixe de
  // nom, jamais une hypothese sur l'ordre du catalogue qui est trie alphabetiquement) une fois le
  // catalogue charge -- panier vide si introuvable, le praticien ajoute lui-meme sa premiere ligne.
  useEffect(() => {
    if (pendingGuidedBasketNonce === null || loading) return
    const consulta = catalogo.find((a) => /^consulta/i.test(a.nombre.trim()))
    setLineasActos(
      consulta
        ? [
            {
              ...emptyLineaActo(),
              mode: 'catalogo',
              actoId: consulta.id,
              monto: consulta.precioDefault !== null ? String(consulta.precioDefault) : '',
            },
          ]
        : []
    )
    setPendingGuidedBasketNonce(null)
  }, [pendingGuidedBasketNonce, loading, catalogo])

  // Ferme le panier (guide ou manuel) sans rien enregistrer -- reutilise par "Omitir esta vez", par
  // "Cancelar", et a la fin de validarPanier() (meme partiellement, cf. prompt).
  const cerrarFormulario = () => {
    setShowForm(false)
    setAppointmentIdPrefill(null)
    setGuided(false)
    setLineasActos([])
    setFecha(new Date().toISOString().slice(0, 10))
  }

  const addLineaActo = () => {
    setLineasActos((prev) => [...prev, emptyLineaActo()])
  }

  const removeLineaActo = (localId: string) => {
    setLineasActos((prev) => prev.filter((l) => l.localId !== localId))
  }

  const updateLineaActo = (localId: string, patch: Partial<LineaActo>) => {
    setLineasActos((prev) => prev.map((l) => (l.localId === localId ? { ...l, ...patch, error: null } : l)))
  }

  // Pre-remplit le montant avec le tarif par defaut de l'acte choisi (meme logique que le
  // formulaire manuel) -- valeur de depart seulement, reste librement modifiable ensuite.
  const handleLineaActoChange = (localId: string, nextActoId: string) => {
    const chosen = catalogo.find((a) => a.id === nextActoId)
    updateLineaActo(localId, {
      actoId: nextActoId,
      monto: chosen?.precioDefault !== null && chosen?.precioDefault !== undefined ? String(chosen.precioDefault) : '',
    })
  }

  const nombreDeLinea = (linea: LineaActo): string =>
    linea.mode === 'catalogo' ? catalogo.find((a) => a.id === linea.actoId)?.nombre ?? t('sinCategoria') : linea.nombreLibre.trim() || t('sinCategoria')

  // Valide chaque ligne du panier (montant valide, acte selectionne ou nom non vide), envoie sequentiellement
  // uniquement les lignes valides vers la meme route POST /actos (un acte par appel, inchangee),
  // continue malgre un echec individuel, puis ferme le panier dans tous les cas (meme partiellement)
  // en affichant un resume clair -- jamais une annulation silencieuse de tout le lot.
  const validarPanier = async () => {
    if (lineasActos.length === 0) {
      // Rien a enregistrer n'est pas une erreur -- meme comportement que "Omitir esta vez".
      cerrarFormulario()
      return
    }
    if (!fecha) {
      toast.error(t('toastFechaRequerida'))
      return
    }

    setSaving(true)
    const validadas = lineasActos.map((linea) => {
      const montoNum = parseFloat(linea.monto)
      let error: string | null = null
      if (linea.monto === '' || isNaN(montoNum) || montoNum < 0) error = t('toastMontoInvalido')
      else if (linea.mode === 'catalogo' && !linea.actoId) error = t('toastSeleccionaActo')
      else if ((linea.mode === 'nuevo' || linea.mode === 'libre') && !linea.nombreLibre.trim()) error = t('toastNombreActoRequerido')
      return { ...linea, error }
    })
    // Affiche l'erreur de validation a cote de la ligne concernee pendant l'envoi sequentiel des
    // lignes valides ci-dessous (plusieurs appels reseau, donc plusieurs rendus) -- le panier ferme
    // ensuite dans tous les cas, mais jamais sans que l'erreur par ligne ait ete reellement rendue.
    setLineasActos(validadas)

    const nuevosActos: ActoHistorial[] = []
    const nuevosEnCatalogo: ActoCatalogo[] = []
    const fallidos: string[] = []
    for (const linea of validadas) {
      if (linea.error) {
        fallidos.push(nombreDeLinea(linea))
        continue
      }
      const res = await fetch(`/api/patients/${patientId}/actos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: linea.mode,
          actoId: linea.mode === 'catalogo' ? linea.actoId : undefined,
          nombre: linea.mode !== 'catalogo' ? linea.nombreLibre.trim() : undefined,
          monto: parseFloat(linea.monto),
          fecha,
          metodoPago: linea.metodoPago,
          appointmentId: appointmentIdPrefill ?? undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        nuevosActos.push(data.acto)
        if (data.nuevoEnCatalogo) nuevosEnCatalogo.push(data.nuevoEnCatalogo)
      } else {
        fallidos.push(nombreDeLinea(linea))
      }
    }

    if (nuevosActos.length > 0) setHistorial((prev) => [...nuevosActos, ...prev])
    if (nuevosEnCatalogo.length > 0) {
      setCatalogo((prev) => [...prev, ...nuevosEnCatalogo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    }

    toast.success(t('toastActosGuardados', { ok: nuevosActos.length, total: validadas.length }))
    if (fallidos.length > 0) {
      toast.error(t('toastActosFallidos', { nombres: fallidos.join(', ') }))
    }

    cerrarFormulario()
    setSaving(false)
  }

  // "Ya pagado por MercadoPago" (Partie C) -- uniquement si un RDV lié a reçu un acompte reel
  // (jamais 'pendiente'/'anulado', ni un acompte nul). monto_acompte > 0 exclut aussi les RDV
  // 'confirmado'/'en_curso' sans acompte dû (montant nul, cf. migration 051) qui n'ont donc jamais
  // rien reçu via MercadoPago malgré un statut postérieur à 'pendiente'.
  const appointmentVinculado = appointmentIdPrefill ? appointments.find((a) => a.id === appointmentIdPrefill) : null
  const yaPagadoMonto =
    appointmentVinculado &&
    appointmentVinculado.monto_acompte > 0 &&
    (appointmentVinculado.statut === 'pagado' || appointmentVinculado.statut === 'en_curso')
      ? appointmentVinculado.monto_acompte
      : null

  // Total/saldo en direct du panier guide (Partie 2 du prompt) -- une ligne au montant invalide/vide
  // contribue 0 a ce stade (juste un apercu live, pas encore une validation ; validarPanier() fera
  // la vraie verification par ligne). Jamais affiche comme une alerte meme negatif (trop paye).
  const totalPanier = lineasActos.reduce((sum, linea) => {
    const n = parseFloat(linea.monto)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  const saldoPendientePanier = totalPanier - (yaPagadoMonto ?? 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CashIcon className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-gray-800">{t('actosRealizadosTitle')}</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true)
              setGuided(false)
              setLineasActos([emptyLineaActo()])
            }}
            className="rounded-lg bg-[#6926D2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0]"
          >
            {t('agregarActo')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="border-b border-gray-100 bg-gray-50 p-5">
          {appointmentIdPrefill && (
            <p className="mb-3 text-xs text-gray-500">{t('vinculadoCita')}</p>
          )}
          {yaPagadoMonto !== null && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">{t('yaPagadoMercadopagoLabel')}</label>
              <input
                disabled
                value={`${monnaie} ${yaPagadoMonto.toFixed(2)}`}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
            </div>
          )}

          <div className="mb-3 max-w-[12rem]">
                <label className="mb-1 block text-xs font-medium text-gray-600">{t('fechaLabel')}</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                />
              </div>

              <div className="mb-3 space-y-3">
                {lineasActos.map((linea) => (
                  <div key={linea.localId} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateLineaActo(linea.localId, { mode: 'catalogo' })}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            linea.mode === 'catalogo' ? 'bg-[#6926D2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t('elegirDeLista')}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLineaActo(linea.localId, { mode: 'nuevo' })}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            linea.mode === 'nuevo' ? 'bg-[#6926D2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t('agregarNuevoActoLista')}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateLineaActo(linea.localId, { mode: 'libre' })}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            linea.mode === 'libre' ? 'bg-[#6926D2] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t('soloEstaVez')}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineaActo(linea.localId)}
                        aria-label={t('quitarLineaActoLabel')}
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {linea.mode === 'catalogo' ? (
                      <div className="mb-2">
                        <select
                          value={linea.actoId}
                          onChange={(e) => handleLineaActoChange(linea.localId, e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                        >
                          <option value="">{t('seleccionarEllipsis')}</option>
                          {catalogo.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nombre}
                            </option>
                          ))}
                        </select>
                        {catalogo.length === 0 && <p className="mt-1 text-xs text-gray-400">{t('listaVaciaHint')}</p>}
                      </div>
                    ) : (
                      <div className="mb-2">
                        <input
                          value={linea.nombreLibre}
                          onChange={(e) => updateLineaActo(linea.localId, { nombreLibre: e.target.value })}
                          placeholder={t('nombreActoPlaceholder')}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.monto}
                        onChange={(e) => updateLineaActo(linea.localId, { monto: e.target.value })}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                      />
                      <select
                        value={linea.metodoPago}
                        onChange={(e) => updateLineaActo(linea.localId, { metodoPago: e.target.value as 'efectivo' | 'transferencia' | 'otro' })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                      >
                        <option value="efectivo">{tIngresos('metodoEfectivo')}</option>
                        <option value="transferencia">{tIngresos('metodoTransferencia')}</option>
                        <option value="otro">{tIngresos('metodoOtro')}</option>
                      </select>
                    </div>
                    {linea.error && <p className="mt-1.5 text-xs text-red-600">{linea.error}</p>}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addLineaActo}
                className="mb-3 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                + {t('agregarOtroActoLabel')}
              </button>

              <div className="mb-3 space-y-1 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('totalLabel')}</span>
                  <span className="font-medium text-gray-800">{monnaie} {totalPanier.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('saldoPendienteLabel')}</span>
                  <span className="text-gray-600">{monnaie} {saldoPendientePanier.toFixed(2)}</span>
                </div>
              </div>

              {guided && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-xs text-warning-700">
                  <WarningIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{t('avisoBalanceIncompleto')}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  {guided ? t('omitirEstaVezLabel') : t('cancelar')}
                </button>
                <button
                  type="button"
                  onClick={validarPanier}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#6926D2] py-2 text-sm font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
                >
                  {saving ? '...' : t('validarLabel')}
                </button>
              </div>
        </div>
      )}

      <div className="max-h-96 space-y-3 overflow-y-auto p-3">
        {loading && <p className="px-5 py-6 text-center text-sm text-gray-400">{t('cargandoEllipsis')}</p>}
        {!loading && historial.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">{t('sinActosRegistrados')}</p>
        )}
        {groupHistorialByFecha(historial).map((grupo) => (
          <div key={grupo.fecha} className="rounded-xl border border-gray-100 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">{grupo.fecha}</p>
              <p className="text-xs font-medium text-gray-500">
                {monnaie} {grupo.total.toFixed(2)}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {grupo.items.map((h) => {
                // Reutilise les libelles/couleurs deja definis pour /dashboard/ingresos (meme sens :
                // mercadopago = succes/automatique, les 3 moyens manuels = brand) plutot que d'en
                // recreer une variante ici.
                const metodoLabel =
                  h.origen === 'mercadopago'
                    ? tIngresos('metodoMercadopago')
                    : h.metodoPago === 'efectivo'
                      ? tIngresos('metodoEfectivo')
                      : h.metodoPago === 'transferencia'
                        ? tIngresos('metodoTransferencia')
                        : tIngresos('metodoOtro')
                return (
                  <div key={`${h.origen}-${h.id}`} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{h.nombre || '-'}</p>
                      <Badge color={h.origen === 'mercadopago' ? 'success' : 'brand'}>{metodoLabel}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{h.monto.toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface MedicamentoForm {
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  instrucciones: string
}

interface PrescripcionHistorial {
  id: string
  fecha: string
  medicamentos: MedicamentoForm[]
  notasAdicionales: string | null
  esBorrador: boolean
  createdAt: string
}

function emptyMedicamento(): MedicamentoForm {
  return { nombre: '', dosis: '', frecuencia: '', duracion: '', instrucciones: '' }
}

// Prescripcion (feuille de prescription simple, imprimable, signee/tamponnee a la main par le
// praticien -- aucune valeur de signature numerique, cf. lib/pdf/prescripcionPdf.tsx) -- meme
// pattern que ActosRealizadosCard (donnee non clinique-confidentielle, pas de PIN). "Guardar
// borrador" cree/met a jour une ligne modifiable (storage_path null) ; "Generar PDF" la fige
// (storage_path renseigne, immuable, cf. route generar) -- le telechargement ne fait jamais que
// servir le fichier deja stocke, cf. prompt prescripciones-borrador.
function PrescripcionesCard({
  patientId,
  notesSnapshot,
  autoOpenRequest,
}: {
  patientId: string
  // Jamais un nouvel appel reseau vers /api/patients/[id]/notes (contournerait le PIN) -- meme
  // etat deja deverrouille en memoire que FotosTab/HistorialCitasCard, transmis par le
  // parent (cf. prompt prescripcion-prefill-notas-adicionales). null = notes jamais deverrouillees
  // cette session, dans ce cas le pre-remplissage ci-dessous reste simplement inactif.
  notesSnapshot: PatientNote[] | null
  // Offre "¿Generar una prescripción?" après "Guardar sesión" (cf. prompt
  // notas-resumen-reorder-historial, Partie 5) -- même mécanisme one-shot par nonce que
  // ActosRealizadosCard.autoOpenRequest, jamais de logique dupliquée.
  autoOpenRequest?: { nonce: number } | null
}) {
  const t = useTranslations('dashboard.patientDetail')
  const [loading, setLoading] = useState(true)
  const [historial, setHistorial] = useState<PrescripcionHistorial[]>([])

  const [showForm, setShowForm] = useState(false)
  // null = pas encore sauvegarde une seule fois (le prochain "Guardar borrador" fera un POST) ;
  // une fois un id obtenu, les sauvegardes suivantes font un PUT sur ce brouillon.
  const [draftId, setDraftId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [medicamentos, setMedicamentos] = useState<MedicamentoForm[]>([emptyMedicamento()])
  const [notasAdicionales, setNotasAdicionales] = useState('')
  const [saving, setSaving] = useState(false)
  const [generando, setGenerando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/patients/${patientId}/prescripciones`)
    if (res.ok) {
      const data = await res.json()
      setHistorial(data.prescripciones ?? [])
    }
    setLoading(false)
  }, [patientId])

  useEffect(() => {
    load()
  }, [load])

  // Pre-remplit avec la derniere note "Tratamiento" uniquement a l'ouverture d'une TOUTE NOUVELLE
  // prescription, jamais si le champ contient deja quelque chose (brouillon en cours ou deja tape)
  // -- et jamais de nouvel appel reseau, uniquement notesSnapshot deja deverrouille cette session
  // (cf. prompt prescripcion-prefill-notas-adicionales). Partagee entre le bouton manuel et l'offre
  // automatique post-"Guardar sesión" (Partie 5) pour ne jamais dupliquer cette logique.
  const openNuevaPrescripcion = useCallback(() => {
    setNotasAdicionales((prev) => {
      if (prev.trim() || !notesSnapshot) return prev
      const ultimoTratamiento = notesSnapshot
        .filter((n) => n.categoria === 'Tratamiento')
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
      return ultimoTratamiento ? ultimoTratamiento.contenido : prev
    })
    setShowForm(true)
  }, [notesSnapshot])

  const handledAutoOpenNonceRef = useRef(0)
  useEffect(() => {
    if (!autoOpenRequest) return
    if (handledAutoOpenNonceRef.current === autoOpenRequest.nonce) return
    handledAutoOpenNonceRef.current = autoOpenRequest.nonce
    openNuevaPrescripcion()
  }, [autoOpenRequest, openNuevaPrescripcion])

  const resetForm = () => {
    setDraftId(null)
    setFecha(new Date().toISOString().slice(0, 10))
    setMedicamentos([emptyMedicamento()])
    setNotasAdicionales('')
  }

  const startEdit = (p: PrescripcionHistorial) => {
    setDraftId(p.id)
    setFecha(p.fecha)
    setMedicamentos(p.medicamentos.length > 0 ? p.medicamentos : [emptyMedicamento()])
    setNotasAdicionales(p.notasAdicionales ?? '')
    setShowForm(true)
  }

  const updateMedicamento = (index: number, field: keyof MedicamentoForm, value: string) => {
    setMedicamentos((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const addMedicamentoRow = () => setMedicamentos((prev) => [...prev, emptyMedicamento()])
  const removeMedicamentoRow = (index: number) =>
    setMedicamentos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const guardarBorrador = async () => {
    if (!fecha) {
      toast.error(t('toastFechaRequerida'))
      return
    }
    const medicamentosValidos = medicamentos.filter((m) => m.nombre.trim())
    if (medicamentosValidos.length === 0) {
      toast.error(t('toastMedicamentoRequerido'))
      return
    }

    setSaving(true)
    const res = await fetch(`/api/patients/${patientId}/prescripciones${draftId ? `/${draftId}` : ''}`, {
      method: draftId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, medicamentos: medicamentosValidos, notasAdicionales: notasAdicionales.trim() || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setDraftId(data.prescripcion.id)
      setHistorial((prev) =>
        draftId ? prev.map((p) => (p.id === data.prescripcion.id ? data.prescripcion : p)) : [data.prescripcion, ...prev]
      )
      toast.success(t('toastPrescripcionGuardada'))
      // Le formulaire reste ouvert (pas de fermeture automatique) : un brouillon reste modifiable,
      // seul "Generar PDF" ferme le formulaire -- cf. prompt prescripciones-borrador.
    } else {
      toast.error(data.error ?? t('toastErrorGuardarPrescripcion'))
    }
    setSaving(false)
  }

  const generarPdf = async () => {
    if (!draftId) return
    setGenerando(true)
    const res = await fetch(`/api/patients/${patientId}/prescripciones/${draftId}/generar`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setHistorial((prev) => prev.map((p) => (p.id === data.prescripcion.id ? data.prescripcion : p)))
      toast.success(t('toastPdfGenerado'))
      resetForm()
      setShowForm(false)
    } else {
      toast.error(data.error ?? t('toastErrorGenerarPdf'))
    }
    setGenerando(false)
  }

  const eliminarPrescripcion = async (id: string) => {
    if (!confirm(t('eliminarPrescripcionConfirm'))) return
    const res = await fetch(`/api/patients/${patientId}/prescripciones/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setHistorial((prev) => prev.filter((p) => p.id !== id))
      if (draftId === id) {
        resetForm()
        setShowForm(false)
      }
      toast.success(t('toastPrescripcionEliminada'))
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? t('toastErrorEliminarPrescripcion'))
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]'

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-[#6926D2]">
            <PillIcon className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-gray-800">{t('recetasAnterioresTitle')}</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openNuevaPrescripcion}
            className="rounded-lg bg-[#6926D2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0]"
          >
            {t('nuevaPrescripcion')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="border-b border-gray-100 bg-gray-50 p-5">
          <div className="mb-3 max-w-xs">
            <label className="mb-1 block text-xs font-medium text-gray-600">{t('fechaLabel')}</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          </div>

          <div className="mb-3 space-y-3">
            {medicamentos.map((m, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <input
                    placeholder={t('medicamentoNombreLabel')}
                    value={m.nombre}
                    onChange={(e) => updateMedicamento(i, 'nombre', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder={t('medicamentoDosisLabel')}
                    value={m.dosis}
                    onChange={(e) => updateMedicamento(i, 'dosis', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder={t('medicamentoFrecuenciaLabel')}
                    value={m.frecuencia}
                    onChange={(e) => updateMedicamento(i, 'frecuencia', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder={t('medicamentoDuracionLabel')}
                    value={m.duracion}
                    onChange={(e) => updateMedicamento(i, 'duracion', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    placeholder={t('medicamentoInstruccionesLabel')}
                    value={m.instrucciones}
                    onChange={(e) => updateMedicamento(i, 'instrucciones', e.target.value)}
                    className={inputClass}
                  />
                </div>
                {medicamentos.length > 1 && (
                  <button type="button" onClick={() => removeMedicamentoRow(i)} className="text-xs text-rose-600 hover:underline">
                    {t('quitarMedicamentoLabel')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMedicamentoRow}
            className="mb-3 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            + {t('agregarMedicamentoLabel')}
          </button>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">{t('notasAdicionalesLabel')}</label>
            <textarea
              value={notasAdicionales}
              onChange={(e) => setNotasAdicionales(e.target.value)}
              placeholder={t('notasAdicionalesPlaceholder')}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              {t('cancelar')}
            </button>
            <button
              type="button"
              onClick={guardarBorrador}
              disabled={saving || generando}
              className="flex-1 rounded-lg border border-[#6926D2] py-2 text-sm font-medium text-[#6926D2] hover:bg-violet-50 disabled:opacity-50"
            >
              {saving ? '...' : t('guardarBorrador')}
            </button>
            <button
              type="button"
              onClick={generarPdf}
              disabled={!draftId || saving || generando}
              className="flex-1 rounded-lg bg-[#6926D2] py-2 text-sm font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
            >
              {generando ? '...' : t('generarPdf')}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
        {loading && <p className="px-5 py-6 text-center text-sm text-gray-400">{t('cargandoEllipsis')}</p>}
        {!loading && historial.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">{t('sinPrescripcionesRegistradas')}</p>
        )}
        {historial.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{p.medicamentos.map((m) => m.nombre).join(', ') || '-'}</p>
                {p.esBorrador && <Badge color="warning">{t('borradorBadge')}</Badge>}
              </div>
              <p className="text-xs text-gray-400">{p.fecha}</p>
            </div>
            <div className="flex items-center gap-3">
              {p.esBorrador ? (
                <button type="button" onClick={() => startEdit(p)} className="text-sm font-medium text-[#6926D2] hover:underline">
                  {t('editarPrescripcionLabel')}
                </button>
              ) : (
                <a
                  href={`/api/patients/${patientId}/prescripciones/${p.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#6926D2] hover:underline"
                >
                  {t('descargarLabel')}
                </a>
              )}
              <button
                type="button"
                onClick={() => eliminarPrescripcion(p.id)}
                aria-label={t('eliminarPrescripcionLabel')}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-red-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AppointmentRow {
  id: string
  fecha_cita: string
  hora_cita: string
  statut: string
  presente: boolean | null
  monto_acompte: number
  // Non null si ce RDV a été créé depuis un lien de relance "próximo control" (cf. migration 043) --
  // seul signal fiable pour distinguer un control d'une consulta normale, cf. prompt
  // notas-resumen-reorder-historial, Partie 2.
  origen_control_sesion_id: string | null
}

// Historial de citas (Partie 1 : descendu en pleine largeur sous Notas clínicas/Actos realizados --
// c'est de la consultation, pas de la saisie) + résumé par RDV (Partie 4) + RDV du jour et dernière
// visite (Partie 2, cf. prompt notas-resumen-reorder-historial), construit uniquement à partir de
// notesSnapshot/historialActos transmis par le parent -- jamais de fetch propre ici, pour ne jamais
// contourner le PIN de Notas clínicas (notesSnapshot reste null tant qu'elle n'est pas déverrouillée).
// Le déverrouillage ("Última visita" floutée) partage le même état/verifyCodigo que NotasClinicasCard
// (un seul point d'entrée, jamais de second mécanisme) -- cf. PinEntryBlock/LockedTeaser.
function HistorialCitasCard({
  appointments,
  notesSnapshot,
  historialActos,
  todayFecha,
  authState,
  onStartUnlock,
  onCancelUnlock,
  verifyCodigo,
  pinLoading,
  pinError,
}: {
  appointments: AppointmentRow[]
  notesSnapshot: PatientNote[] | null
  historialActos: ActoHistorial[]
  // Date du jour dans le fuseau du tenant ('YYYY-MM-DD', cf. ahoraEnFuseau) -- null si le fuseau de
  // l'organisation n'a pas pu être chargé (aucune carte "RDV du jour" affichée dans ce cas).
  todayFecha: string | null
  authState: 'locked' | 'pin' | 'unlocked'
  onStartUnlock: () => void
  onCancelUnlock: () => void
  verifyCodigo: (pin: string) => Promise<boolean>
  pinLoading: boolean
  pinError: string | null
}) {
  const t = useTranslations('dashboard.patientDetail')
  const locale = useLocale()
  const intlLocale = INTL_LOCALE[locale] ?? 'es-PE'
  const [modalAppointmentId, setModalAppointmentId] = useState<string | null>(null)

  const notasPorCita = new Map<string, PatientNote[]>()
  if (notesSnapshot) {
    for (const note of notesSnapshot) {
      if (!note.appointmentId) continue
      const arr = notasPorCita.get(note.appointmentId) ?? []
      arr.push(note)
      notasPorCita.set(note.appointmentId, arr)
    }
  }

  function resumenFor(appointmentId: string): string | null {
    const relevante = findUltimoResumen(notasPorCita.get(appointmentId) ?? null)
    return relevante ? truncate(relevante.contenido) : null
  }

  const modalAppointment = appointments.find((a) => a.id === modalAppointmentId) ?? null
  const modalNotes = modalAppointmentId ? notasPorCita.get(modalAppointmentId) ?? [] : []
  const modalActos = modalAppointmentId ? historialActos.filter((h) => h.appointmentId === modalAppointmentId) : []

  const todayAppointment = todayFecha ? appointments.find((a) => a.fecha_cita === todayFecha) ?? null : null

  // Session de notes la plus récente (déjà triées plus récent -> plus ancien côté serveur) -- jamais
  // la galerie complète, seulement cette session précise (cf. prompt, Partie 2).
  const ultimaSesion = notesSnapshot && notesSnapshot.length > 0 ? groupNotesBySesion(notesSnapshot)[0] : null
  const ultimaSesionFecha = ultimaSesion?.notes[0]?.created_at ?? null
  const ultimaSesionTexto = ultimaSesion
    ? ultimaSesion.notes
        .map((n) => n.contenido)
        .join(' · ')
    : ''
  const ultimaSesionFotos = ultimaSesion ? ultimaSesion.notes.flatMap((n) => n.photos ?? []) : []

  return (
    <div className="space-y-4">
      {todayAppointment && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{t('citaHoyLabel')}</p>
            <p className="text-xs text-gray-400">
              {todayAppointment.fecha_cita} {t('aLas')} {todayAppointment.hora_cita}
            </p>
          </div>
          <Badge color={todayAppointment.origen_control_sesion_id ? 'warning' : 'gray'}>
            {todayAppointment.origen_control_sesion_id ? t('citaHoyControlBadge') : t('citaHoyNuevaBadge')}
          </Badge>
        </div>
      )}

      {authState === 'unlocked' ? (
        ultimaSesion ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{t('ultimaVisitaTitle')}</h3>
              {ultimaSesionFecha && (
                <span className="text-xs text-gray-400">
                  {new Date(ultimaSesionFecha).toLocaleDateString(intlLocale)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">{truncate(ultimaSesionTexto, 220)}</p>
            {ultimaSesionFotos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ultimaSesionFotos.map(
                  (photo) =>
                    photo.url && (
                      <div key={photo.id} className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={t('fotoClinicaAlt')} className="h-full w-full object-cover" />
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <p className="text-sm text-gray-400">{t('sinVisitasRegistradas')}</p>
          </div>
        )
      ) : (
        <div id="historial-ultima-visita-locked" className="relative min-h-[230px] rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Jamais de vraie donnée ici tant que non déverrouillé (notesSnapshot reste null) --
              simple silhouette décorative, le flou CSS seul ne protégerait pas des vraies notes. */}
          <div aria-hidden className="pointer-events-none select-none blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{t('ultimaVisitaTitle')}</h3>
              <span className="text-xs text-gray-400">•• ••• ••••</span>
            </div>
            <p className="text-sm text-gray-700">
              ████████ ███████ ████ ███████████ ██████ ████ ████████████ ██ ██████ ████ ████████.
            </p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 p-4">
            {authState === 'pin' ? (
              <PinEntryBlock
                idPrefix="historial"
                title={t('ultimaVisitaTitle')}
                desc={t('ingresaCodigoSeguridad')}
                onCancel={onCancelUnlock}
                onSubmit={verifyCodigo}
                loading={pinLoading}
                error={pinError}
                className="w-full max-w-xs"
              />
            ) : (
              <button
                type="button"
                onClick={onStartUnlock}
                className="rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
              >
                {t('desbloquear')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <CalendarIcon className="h-4 w-4" />
        </div>
        <h2 className="font-semibold text-gray-800">{t('historialCitas')}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {appointments.length === 0 && <p className="px-5 py-6 text-center text-sm text-gray-400">{t('sinCitas')}</p>}
        {appointments.map((appt) => {
          const resumen = resumenFor(appt.id)
          const rowContent = (
            <>
              <div className="flex items-center gap-4">
                <span className="text-lg">{appt.presente === true ? '✓' : appt.presente === false ? '✗' : '·'}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {appt.fecha_cita} {t('aLas')} {appt.hora_cita}
                  </p>
                  <p className="text-xs text-gray-400">
                    {appt.presente === true ? t('presente') : appt.presente === false ? t('ausente') : t('sinMarcar')}
                  </p>
                  {resumen && <p className="mt-1 max-w-sm truncate text-xs text-[#6926D2]">{resumen}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={STATUS_BADGE[appt.statut as keyof typeof STATUS_BADGE] ?? 'gray'}>
                  {STATUS_LABEL_KEY[appt.statut] ? t(STATUS_LABEL_KEY[appt.statut]) : appt.statut}
                </Badge>
                <span className="text-gray-300 group-hover:text-gray-400">›</span>
              </div>
            </>
          )
          const rowClassName = `group flex w-full items-center justify-between border-l-[3px] px-5 py-3 text-left transition-colors hover:bg-gray-50 ${
            STATUS_BORDER[appt.statut as keyof typeof STATUS_BORDER] ?? '!border-l-gray-200'
          }`
          // Ligne cliquable -> modale de détail uniquement quand un résumé est affiché (donc que des
          // données existent réellement à montrer) -- sinon comportement inchangé (lien direct vers
          // la fiche du RDV).
          return resumen ? (
            <button key={appt.id} type="button" onClick={() => setModalAppointmentId(appt.id)} className={rowClassName}>
              {rowContent}
            </button>
          ) : (
            <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`} className={rowClassName}>
              {rowContent}
            </Link>
          )
        })}
      </div>

      {modalAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setModalAppointmentId(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {modalAppointment.fecha_cita} {t('aLas')} {modalAppointment.hora_cita}
                </p>
                <Link
                  href={`/dashboard/appointments/${modalAppointment.id}`}
                  className="text-xs text-[#6926D2] hover:underline"
                >
                  {t('verDetalleRdvLabel')}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setModalAppointmentId(null)}
                aria-label={t('cerrarLabel')}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {modalNotes.map((note) => (
                <div key={note.id} className="rounded-lg bg-gray-50 p-2.5">
                  {note.categoria && (
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColor(note.categoria)}`}>
                      {note.categoria}
                    </span>
                  )}
                  <p className="text-sm text-gray-700">{note.contenido}</p>
                </div>
              ))}
            </div>

            {modalActos.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="mb-1.5 text-xs font-medium text-gray-500">{t('actosRealizadosTitle')}</p>
                {modalActos.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700">{h.nombre}</span>
                    <span className="font-medium text-gray-800">{h.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

interface FotoItem {
  photo: PatientNotePhoto
  noteId: string
  date: string
  pairLabel?: 'antes' | 'despues'
}

// Construit la liste d'items à afficher dans l'onglet Fotos -- une note avec exactement une photo
// "antes" ET une photo "despues" devient une paire (affichées côte à côte) ; toute autre
// combinaison (pas de tag, un seul tag, ou plusieurs photos sans la paire complète) reste un
// affichage chronologique simple, photo par photo. notes est déjà trié du plus récent au plus
// ancien (ordre serveur), donc l'ordre de sortie l'est aussi.
function buildFotoRows(notes: PatientNote[]): { key: string; pair: [FotoItem, FotoItem] | null; single: FotoItem | null }[] {
  const rows: { key: string; pair: [FotoItem, FotoItem] | null; single: FotoItem | null }[] = []
  for (const note of notes) {
    const photos = note.photos ?? []
    const antes = photos.find((p) => p.momento === 'antes')
    const despues = photos.find((p) => p.momento === 'despues')
    if (antes && despues) {
      rows.push({
        key: `${note.id}-pair`,
        pair: [
          { photo: antes, noteId: note.id, date: note.created_at, pairLabel: 'antes' },
          { photo: despues, noteId: note.id, date: note.created_at, pairLabel: 'despues' },
        ],
        single: null,
      })
      for (const p of photos) {
        if (p.id !== antes.id && p.id !== despues.id) {
          rows.push({ key: p.id, pair: null, single: { photo: p, noteId: note.id, date: note.created_at } })
        }
      }
    } else {
      for (const p of photos) {
        rows.push({ key: p.id, pair: null, single: { photo: p, noteId: note.id, date: note.created_at } })
      }
    }
  }
  return rows
}

// Onglet Fotos : TOUTES les photos du patient, toutes notes confondues -- construit uniquement à
// partir de notesSnapshot transmis par NotasClinicasCard, jamais de fetch propre (même raison que
// HistorialCitasCard : ne jamais contourner le PIN de Notas clínicas).
function FotosTab({ notesSnapshot, onGoToNotas }: { notesSnapshot: PatientNote[] | null; onGoToNotas: () => void }) {
  const t = useTranslations('dashboard.patientDetail')
  const locale = useLocale()
  const intlLocale = INTL_LOCALE[locale] ?? 'es-PE'
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (notesSnapshot === null) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-[#6926D2]">
          <LockIcon className="h-6 w-6" />
        </div>
        <p className="text-sm text-gray-500">{t('fotosBloqueadoHint')}</p>
        <button type="button" onClick={onGoToNotas} className="mt-3 text-sm font-medium text-[#6926D2] hover:underline">
          {t('irANotasClinicas')}
        </button>
      </div>
    )
  }

  const rows = buildFotoRows(notesSnapshot)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setLightboxUrl(null)}>
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label={t('cerrarLabel')}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt={t('fotoClinicaAlt')} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t('sinFotos')}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) =>
            row.pair ? (
              <div key={row.key} className="grid grid-cols-2 gap-3">
                {row.pair.map((item) => (
                  <div key={item.photo.id} className="overflow-hidden rounded-xl border border-gray-200">
                    {item.photo.url ? (
                      <button type="button" onClick={() => setLightboxUrl(item.photo.url)} className="block w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.photo.url} alt={t('fotoClinicaAlt')} className="h-40 w-full object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-gray-400">
                        <PhotoIcon className="h-6 w-6" />
                      </div>
                    )}
                    <p className="bg-violet-50 px-2 py-1 text-center text-xs font-medium text-[#6926D2]">
                      {item.pairLabel === 'antes' ? t('momentoAntes') : t('momentoDespues')}
                    </p>
                  </div>
                ))}
              </div>
            ) : row.single ? (
              <div key={row.key} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  {row.single.photo.url ? (
                    <button type="button" onClick={() => setLightboxUrl(row.single!.photo.url)} className="block h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.single.photo.url} alt={t('fotoClinicaAlt')} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                      <PhotoIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">{new Date(row.single.date).toLocaleDateString(intlLocale)}</p>
                  {row.single.photo.momento && (
                    <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-[#6926D2]">
                      {row.single.photo.momento === 'antes' ? t('momentoAntes') : t('momentoDespues')}
                    </span>
                  )}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

type PatientTabId = 'historial' | 'notas' | 'prescripciones' | 'actos' | 'fotos'

function PercentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm9 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    </svg>
  )
}

function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  )
}

export default function PatientDetailView({
  patient,
  appointments,
  presenceRate,
  totalAppointments,
  markedAppointments,
  monnaie,
  fuseau,
}: {
  patient: { id: string; nom: string; email: string | null; telefono: string | null; created_at: string }
  appointments: AppointmentRow[]
  presenceRate: number | null
  totalAppointments: number
  markedAppointments: number
  monnaie: string
  // Fuseau horaire du tenant (organizations.fuseau) -- sert uniquement à déterminer si un RDV est
  // "aujourd'hui" pour le nouveau bloc de Historial de citas (Partie 2, cf. prompt
  // notas-resumen-reorder-historial), même fonction ahoraEnFuseau que le reste du code.
  fuseau: string
}) {
  const t = useTranslations('dashboard.patientDetail')
  const [historialActos, setHistorialActos] = useState<ActoHistorial[]>([])
  const [activeTab, setActiveTab] = useState<PatientTabId>('historial')

  // Authentification des Notas clínicas partagée entre NotasClinicasCard et le bloc "Última visita"
  // de Historial de citas -- un seul point d'entrée de déverrouillage (verifyCodigo ci-dessous),
  // jamais de second mécanisme qui le contournerait (cf. prompt notas-resumen-reorder-historial,
  // Partie 3). notesSnapshot/proximoControlSnapshot dérivés directement de cet état, jamais d'une
  // copie séparée : les deux emplacements restent donc toujours en phase, dans les deux sens.
  const [notasState, setNotasState] = useState<'locked' | 'pin' | 'unlocked'>('locked')
  const [notasCodigo, setNotasCodigo] = useState<string | null>(null)
  const [notas, setNotas] = useState<PatientNote[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoriasConFoto, setCategoriasConFoto] = useState<string[]>([])
  const [alerta, setAlerta] = useState<string | null>(null)
  const [alertaUpdatedAt, setAlertaUpdatedAt] = useState<string | null>(null)
  const [proximoControl, setProximoControl] = useState<ProximoControl | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)

  const verifyCodigo = useCallback(
    async (pin: string): Promise<boolean> => {
      setPinLoading(true)
      setPinError(null)
      const res = await fetch(`/api/patients/${patient.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: pin }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotasCodigo(pin)
        setNotas(data.notes)
        setCategorias(data.categorias ?? [])
        setAlerta(data.alerta ?? null)
        setAlertaUpdatedAt(data.alertaUpdatedAt ?? null)
        setCategoriasConFoto(data.categoriasConFoto ?? [])
        setProximoControl(data.proximoControl ?? null)
        setNotasState('unlocked')
        setPinLoading(false)
        return true
      }
      setPinError(data.error ?? t('toastCodigoIncorrecto'))
      setPinLoading(false)
      return false
    },
    [patient.id, t]
  )

  const lockNotas = useCallback(() => {
    setNotasState('locked')
    setNotasCodigo(null)
    setNotas([])
    setCategorias([])
    setCategoriasConFoto([])
    setAlerta(null)
    setAlertaUpdatedAt(null)
    setProximoControl(null)
    setPinError(null)
    setPinLoading(false)
  }, [])

  const notesSnapshot = notasState === 'unlocked' ? notas : null

  const todayFecha = fuseau ? ahoraEnFuseau(fuseau).fecha : null

  // Signal one-shot (étape guidée post-validation de note, cf. NotasClinicasCard.onSessionCreated)
  // consommé par ActosRealizadosCard.autoOpenRequest -- jamais de logique dupliquée, uniquement un
  // changement d'onglet + une demande d'ouverture déjà gérée par cette carte.
  const [autoOpenActoRequest, setAutoOpenActoRequest] = useState<{ nonce: number; appointmentId: string | null; guided: boolean } | null>(
    null
  )
  // Offre "¿Generar una prescripción?" après "Guardar sesión" (cf. prompt
  // notas-resumen-reorder-historial, Partie 5) -- jamais un verrou de navigation, uniquement une
  // suggestion ponctuelle ; "Sí" arme en même temps l'étape guidée Actos realizados pour quand le
  // praticien y arrivera, "No" y bascule directement comme avant.
  const [prescripcionOffer, setPrescripcionOffer] = useState<{ appointmentId: string | null } | null>(null)
  const [prescripcionAutoOpenRequest, setPrescripcionAutoOpenRequest] = useState<{ nonce: number } | null>(null)
  const actoNonceRef = useRef(0)
  const prescripcionNonceRef = useRef(0)

  // Validation d'une nouvelle note clinique (jamais lors d'un ajout via "Editar", cf.
  // NotasClinicasCard.onSessionCreated) -- propose d'abord de générer une prescription.
  const handleNotaValidada = (resolvedAppointmentId: string | null) => {
    setPrescripcionOffer({ appointmentId: resolvedAppointmentId })
  }
  const handlePrescripcionOfferSi = () => {
    prescripcionNonceRef.current += 1
    setPrescripcionAutoOpenRequest({ nonce: prescripcionNonceRef.current })
    actoNonceRef.current += 1
    setAutoOpenActoRequest({ nonce: actoNonceRef.current, appointmentId: prescripcionOffer?.appointmentId ?? null, guided: true })
    setActiveTab('prescripciones')
    setPrescripcionOffer(null)
  }
  const handlePrescripcionOfferNo = () => {
    actoNonceRef.current += 1
    setAutoOpenActoRequest({ nonce: actoNonceRef.current, appointmentId: prescripcionOffer?.appointmentId ?? null, guided: true })
    setActiveTab('actos')
    setPrescripcionOffer(null)
  }

  const TABS: { id: PatientTabId; label: string }[] = [
    { id: 'historial', label: t('tabHistorialCitas') },
    { id: 'notas', label: t('tabNotasClinicas') },
    { id: 'prescripciones', label: t('tabPrescripciones') },
    { id: 'actos', label: t('tabActosRealizados') },
    { id: 'fotos', label: t('tabFotos') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-[#6926D2]">
            {patient.nom.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{patient.nom}</h1>
            <p className="text-sm text-gray-500">
              {patient.email ?? t('noEmail')} · {patient.telefono ?? t('noTelefono')}
            </p>
          </div>
        </div>
        <Link href="/dashboard/patients" className="text-sm text-[#6926D2] hover:underline">
          ← {t('volver')}
        </Link>
      </div>

      {/* Stats en ligne -- icône en médaillon violet/vert/rose, mêmes données qu'avant */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#6926D2]">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{totalAppointments}</p>
            <p className="text-xs text-gray-500">{t('citasTotales')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <PercentIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{presenceRate !== null ? `${presenceRate}%` : '—'}</p>
            <p className="text-xs text-gray-500">{t('tasaAsistencia')}</p>
            {presenceRate !== null && <p className="text-xs text-gray-400">{t('marcadas', { count: markedAppointments })}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{appointments.filter((a) => a.presente === false).length}</p>
            <p className="text-xs text-gray-500">{t('noShows')}</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-[#6926D2] text-[#6926D2]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Offre ponctuelle après "Guardar sesión" (Partie 5) -- jamais un verrou de navigation,
          juste une suggestion ; visible quel que soit l'onglet actif. */}
      {prescripcionOffer && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3">
          <p className="text-sm font-medium text-violet-900">{t('generarPrescripcionPregunta')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrescripcionOfferNo}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('ahoraNoLabel')}
            </button>
            <button
              type="button"
              onClick={handlePrescripcionOfferSi}
              className="rounded-lg bg-[#6926D2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5a1fb0]"
            >
              {t('siGenerarPrescripcionLabel')}
            </button>
          </div>
        </div>
      )}

      {/* Tous les panneaux restent montés en permanence (affichage CSS only, jamais démontés) :
          NotasClinicasCard doit garder son minuteur d'inactivité, son brouillon de session et son
          état déverrouillé intacts quel que soit l'onglet affiché. */}
      <div className={activeTab === 'historial' ? '' : 'hidden'}>
        <HistorialCitasCard
          appointments={appointments}
          notesSnapshot={notesSnapshot}
          historialActos={historialActos}
          todayFecha={todayFecha}
          authState={notasState}
          onStartUnlock={() => setNotasState('pin')}
          onCancelUnlock={() => setNotasState('locked')}
          verifyCodigo={verifyCodigo}
          pinLoading={pinLoading}
          pinError={pinError}
        />
      </div>
      <div className={activeTab === 'notas' ? '' : 'hidden'}>
        <NotasClinicasCard
          patientId={patient.id}
          state={notasState}
          setState={setNotasState}
          codigo={notasCodigo}
          notes={notas}
          setNotes={setNotas}
          categorias={categorias}
          categoriasConFoto={categoriasConFoto}
          alerta={alerta}
          setAlerta={setAlerta}
          alertaUpdatedAt={alertaUpdatedAt}
          setAlertaUpdatedAt={setAlertaUpdatedAt}
          proximoControl={proximoControl}
          setProximoControl={setProximoControl}
          pinError={pinError}
          pinLoading={pinLoading}
          verifyCodigo={verifyCodigo}
          onLock={lockNotas}
          onSessionCreated={handleNotaValidada}
        />
      </div>
      <div className={activeTab === 'prescripciones' ? '' : 'hidden'}>
        <PrescripcionesCard patientId={patient.id} notesSnapshot={notesSnapshot} autoOpenRequest={prescripcionAutoOpenRequest} />
      </div>
      <div className={activeTab === 'actos' ? '' : 'hidden'}>
        <ActosRealizadosCard
          patientId={patient.id}
          onHistorialChange={setHistorialActos}
          autoOpenRequest={autoOpenActoRequest}
          appointments={appointments}
          monnaie={monnaie}
        />
      </div>
      <div className={activeTab === 'fotos' ? '' : 'hidden'}>
        <FotosTab notesSnapshot={notesSnapshot} onGoToNotas={() => setActiveTab('notas')} />
      </div>
    </div>
  )
}
