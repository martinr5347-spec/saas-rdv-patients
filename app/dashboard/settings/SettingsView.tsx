'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import {
  NotificationType,
  VariantId,
  VARIANT_IDS,
  VARIANT_LABELS,
  NOTIFICATION_TYPE_LABELS,
  getPreview,
  CONTROL_RECALL_LABEL,
  getControlRecallPreview,
} from '@/lib/dispatcher/templateVariants'
import { getMercadoPagoDevPanelUrl } from '@/lib/payments/mercadopagoDomains'

const NOTIFICATION_TYPES: NotificationType[] = ['confirmation', 'aviso', 'pago', 'anulacion', 'recordatorio', 'reprogramacion']
const CURRENCIES = ['PEN', 'BRL', 'MXN', 'COP', 'CLP', 'ARS', 'UYU', 'USD'] as const

export interface OrgSettings {
  delai_paiement_h: number | null
  delai_aviso_h: number | null
  delai_rappel_h: number | null
  monto_acompte: number | null
  costo_total: number | null
  monnaie: string | null
  calendly_url: string | null
  unipile_account_id: string | null
  mp_notification_url: string | null
  canal_email: boolean | null
  canal_whatsapp: boolean | null
  canal_whatsapp_provider: string | null
  twilio_subaccount_sid: string | null
  twilio_whatsapp_number: string | null
  variantes_mensaje: unknown
  categorias_notas: string[] | null
  categorias_con_foto: string[] | null
  variante_control_recall: string | null
  control_recall_anticipacion_dias: number | null
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <svg className="h-4 w-4 cursor-help text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
      </svg>
      <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-gray-800 p-2.5 text-xs leading-snug text-white group-hover:block">
        {text}
      </div>
    </div>
  )
}

function SeguridadNotasCard({ lastUpdated }: { lastUpdated: string | null }) {
  // lastUpdated n'est renseigne qu'au moment ou codigo_seguridad_hash est ecrit la premiere
  // fois (meme requete UPDATE) -- un signal fiable pour savoir si un PIN existe deja, sans
  // avoir a exposer le hash lui-meme au client.
  const pinYaExiste = lastUpdated !== null
  const [currentDigits, setCurrentDigits] = useState(['', '', '', ''])
  const [digits, setDigits] = useState(['', '', '', ''])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const codigoNuevo = digits.join('')
    if (codigoNuevo.length !== 4) {
      toast.error('Ingresa un código de 4 dígitos')
      return
    }
    const codigoActual = currentDigits.join('')
    if (pinYaExiste && codigoActual.length !== 4) {
      toast.error('Ingresa tu código actual')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users/me/security-code', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pinYaExiste ? { codigoNuevo, codigoActual } : { codigoNuevo }),
    })
    if (res.ok) {
      toast.success('Código actualizado')
      setDigits(['', '', '', ''])
      setCurrentDigits(['', '', '', ''])
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Error al guardar el código')
    }
    setSaving(false)
  }

  return (
    <Card>
      <div className="mb-1 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-gray-800">Código de seguridad para notas clínicas</h2>
        <div className="group relative inline-flex">
          <svg className="h-4 w-4 cursor-help text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
          </svg>
          <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-gray-800 p-2.5 text-xs leading-snug text-white group-hover:block">
            Este código de 4 dígitos protege el acceso a las notas clínicas confidenciales en la ficha de cada paciente.
          </div>
        </div>
      </div>
      {lastUpdated && (
        <p className="mb-3 text-xs text-gray-400">Último cambio: {new Date(lastUpdated).toLocaleDateString('es')}</p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        {pinYaExiste && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Código actual</label>
            <div className="flex gap-1.5">
              {currentDigits.map((d, i) => (
                <input
                  key={i}
                  id={`settings-pin-current-${i}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    const next = [...currentDigits]
                    next[i] = val
                    setCurrentDigits(next)
                    if (val && i < 3) {
                      document.getElementById(`settings-pin-current-${i + 1}`)?.focus()
                    } else if (val && i === 3) {
                      document.getElementById('settings-pin-0')?.focus()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !currentDigits[i] && i > 0) {
                      document.getElementById(`settings-pin-current-${i - 1}`)?.focus()
                    }
                  }}
                  className="h-11 w-10 rounded-lg border border-gray-200 text-center font-semibold focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                />
              ))}
            </div>
          </div>
        )}
        <div>
          {pinYaExiste && <label className="mb-1.5 block text-xs font-medium text-gray-600">Código nuevo</label>}
          <div className="flex gap-1.5">
            {digits.map((d, i) => (
              <input
                key={i}
                id={`settings-pin-${i}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  const next = [...digits]
                  next[i] = val
                  setDigits(next)
                  if (val && i < 3) {
                    document.getElementById(`settings-pin-${i + 1}`)?.focus()
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digits[i] && i > 0) {
                    document.getElementById(`settings-pin-${i - 1}`)?.focus()
                  }
                }}
                className="h-11 w-10 rounded-lg border border-gray-200 text-center font-semibold focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </Card>
  )
}

function MercadoPagoTokenField({
  mpTokenConfigured,
  mpTokenLast4,
  pays,
  updateMpAccessTokenAction,
}: {
  mpTokenConfigured: boolean
  mpTokenLast4: string | null
  pays: string | null
  updateMpAccessTokenAction: (token: string) => Promise<{ ok: boolean; error?: string; nickname?: string; email?: string; last4?: string }>
}) {
  const t = useTranslations('dashboard.settings')
  const [configured, setConfigured] = useState(mpTokenConfigured)
  const [last4, setLast4] = useState(mpTokenLast4)
  // Fallback PE gere en interne par getMercadoPagoDevPanelUrl -- jamais de pays reconnu
  // manquant ne doit cacher le lien ni planter la page.
  const devPanelUrl = getMercadoPagoDevPanelUrl(pays ?? 'PE')
  const devPanelDomain = devPanelUrl.replace('https://www.', '').replace(/^https?:\/\//, '')
  // Pas d'etat "editing" distinct de !configured : tant qu'aucun token valide n'a ete enregistre
  // (ou n'a ete reenregistre avec succes), le champ reste visible -- jamais de prefill avec la
  // vraie valeur, le champ part toujours vide.
  const [editing, setEditing] = useState(!mpTokenConfigured)
  const [tokenDraft, setTokenDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!tokenDraft.trim()) return
    setSaving(true)
    const res = await updateMpAccessTokenAction(tokenDraft.trim())
    if (res.ok) {
      setConfigured(true)
      setLast4(res.last4 ?? null)
      setEditing(false)
      setTokenDraft('')
      const conectadoComo = res.nickname || res.email
      toast.success(conectadoComo ? `Conectado como: ${conectadoComo}` : 'Token guardado')
    } else {
      toast.error(res.error ?? 'Error al guardar el token')
    }
    setSaving(false)
  }

  if (configured && !editing) {
    return (
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {t('mpToken')}
          <InfoTooltip text="Clave de acceso de tu cuenta de MercadoPago, necesaria para recibir pagos en línea." />
        </label>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-sm text-gray-600">Conectado · termina en ••••{last4}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-[#6926D2] hover:underline"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {t('mpToken')}
        <InfoTooltip text="Clave de acceso de tu cuenta de MercadoPago, necesaria para recibir pagos en línea." />
      </label>
      <a
        href={devPanelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-xs font-medium text-[#6926D2] hover:underline"
      >
        {t('mpDevPanelLink', { domain: devPanelDomain })}
      </a>
      <div className="mt-1 flex gap-2">
        <input
          type="password"
          value={tokenDraft}
          onChange={(e) => setTokenDraft(e.target.value)}
          placeholder="Pegar nuevo token"
          className="mt-0 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !tokenDraft.trim()}
          className="shrink-0 rounded-lg bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] disabled:opacity-50"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// Visible uniquement si canal_whatsapp_provider = 'twilio' (bascule geree manuellement par Martin
// en base, pas de toggle self-service ici -- cf. lib/dispatcher/index.ts). Meme UX de token masque
// que MercadoPagoTokenField : jamais de prefill avec la vraie valeur, le champ auth token part
// toujours vide ("Cambiar" pour le reecrire). subaccountSid/whatsappNumber ne sont pas des secrets,
// affiches en clair.
function TwilioSettingsFields({
  subaccountSid,
  whatsappNumber,
  authTokenConfigured,
  authTokenLast4,
  updateTwilioSettingsAction,
}: {
  subaccountSid: string | null
  whatsappNumber: string | null
  authTokenConfigured: boolean
  authTokenLast4: string | null
  updateTwilioSettingsAction: (
    subaccountSid: string,
    whatsappNumber: string,
    authToken: string
  ) => Promise<{ ok: boolean; error?: string; last4?: string }>
}) {
  const [sidDraft, setSidDraft] = useState(subaccountSid ?? '')
  const [numberDraft, setNumberDraft] = useState(whatsappNumber ?? '')
  const [configured, setConfigured] = useState(authTokenConfigured)
  const [last4, setLast4] = useState(authTokenLast4)
  const [editingToken, setEditingToken] = useState(!authTokenConfigured)
  const [tokenDraft, setTokenDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await updateTwilioSettingsAction(sidDraft, numberDraft, tokenDraft.trim())
    if (res.ok) {
      if (res.last4) {
        setConfigured(true)
        setLast4(res.last4)
        setEditingToken(false)
      }
      setTokenDraft('')
      toast.success('Configuración de Twilio guardada')
    } else {
      toast.error(res.error ?? 'Error al guardar la configuración de Twilio')
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">WhatsApp vía Twilio (API oficial)</p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subaccount SID</label>
          <input
            value={sidDraft}
            onChange={(e) => setSidDraft(e.target.value)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de WhatsApp</label>
          <input
            value={numberDraft}
            onChange={(e) => setNumberDraft(e.target.value)}
            placeholder="+51987654321"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Auth token</label>
          {configured && !editingToken ? (
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm text-gray-600">Conectado · termina en ••••{last4}</span>
              <button
                type="button"
                onClick={() => setEditingToken(true)}
                className="text-sm font-medium text-[#6926D2] hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <input
              type="password"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              placeholder="Pegar auth token"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] disabled:opacity-50"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function CategoriasNotasCard({
  initial,
  initialConFoto,
  updateCategoriasNotasAction,
  updateCategoriasConFotoAction,
}: {
  initial: string[]
  initialConFoto: string[]
  updateCategoriasNotasAction: (categorias: string[]) => Promise<{ ok: boolean; error?: string; categorias?: string[] }>
  updateCategoriasConFotoAction: (categorias: string[]) => Promise<{ ok: boolean; error?: string; categorias?: string[] }>
}) {
  const [categorias, setCategorias] = useState<string[]>(initial)
  const [categoriasConFoto, setCategoriasConFoto] = useState<string[]>(initialConFoto)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingFoto, setSavingFoto] = useState(false)

  const addCategoria = () => {
    const val = draft.trim().slice(0, 24)
    if (!val) return
    if (categorias.some((c) => c.toLowerCase() === val.toLowerCase())) {
      toast.error('Esa categoría ya existe')
      return
    }
    if (categorias.length >= 10) {
      toast.error('Máximo 10 categorías')
      return
    }
    setCategorias((prev) => [...prev, val])
    setDraft('')
  }

  const removeCategoria = (val: string) => {
    setCategorias((prev) => prev.filter((c) => c !== val))
  }

  const save = async () => {
    setSaving(true)
    const res = await updateCategoriasNotasAction(categorias)
    if (res.ok) {
      if (res.categorias) setCategorias(res.categorias)
      toast.success('Categorías guardadas')
    } else {
      toast.error(res.error ?? 'Error al guardar las categorías')
    }
    setSaving(false)
  }

  const toggleFoto = async (cat: string, checked: boolean) => {
    const next = checked ? [...categoriasConFoto, cat] : categoriasConFoto.filter((c) => c !== cat)
    setCategoriasConFoto(next)
    setSavingFoto(true)
    const res = await updateCategoriasConFotoAction(next)
    if (res.ok) {
      if (res.categorias) setCategoriasConFoto(res.categorias)
    } else {
      toast.error(res.error ?? 'Error al guardar')
      setCategoriasConFoto(categoriasConFoto) // revert
    }
    setSavingFoto(false)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-gray-800">Categorías de notas clínicas</h2>
      <p className="mb-3 mt-1 text-xs text-gray-500">
        Estas categorías aparecerán como filtros y etiquetas en las notas clínicas de tus pacientes. &ldquo;Permite foto&rdquo;
        controla si se puede adjuntar una foto a las notas de esa categoría.
      </p>
      <div className="mb-3 space-y-1.5">
        {categorias.map((c) => (
          <div key={c} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
              {c}
              <button
                type="button"
                onClick={() => removeCategoria(c)}
                aria-label={`Quitar ${c}`}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </span>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={categoriasConFoto.includes(c)}
                disabled={savingFoto}
                onChange={(e) => toggleFoto(c, e.target.checked)}
              />
              Permite foto
            </label>
          </div>
        ))}
        {categorias.length === 0 && <p className="text-xs text-gray-400">Sin categorías configuradas.</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 24))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCategoria()
            }
          }}
          maxLength={24}
          placeholder="Nueva categoría"
          disabled={categorias.length >= 10}
          className="w-48 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addCategoria}
          disabled={categorias.length >= 10 || !draft.trim()}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-[#6926D2] hover:text-[#6926D2] active:scale-[0.98] disabled:opacity-50"
        >
          Agregar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </Card>
  )
}

export default function SettingsView({
  settings,
  subscriptionStatut,
  hasStripeCustomer,
  organizationLangue,
  organizationAdresse,
  organizationPays,
  organizationEspecialidad,
  nombreCompleto,
  especialidadTexto,
  fotoUrl,
  codigoSeguridadUpdatedAt,
  mpTokenConfigured,
  mpTokenLast4,
  twilioAuthTokenConfigured,
  twilioAuthTokenLast4,
  updateSettingsAction,
  openBillingPortalAction,
  updateCategoriasNotasAction,
  updateCategoriasConFotoAction,
  updateMpAccessTokenAction,
  updateTwilioSettingsAction,
}: {
  settings: OrgSettings | null
  subscriptionStatut: string | null
  hasStripeCustomer: boolean
  organizationLangue: string | null
  organizationAdresse: string | null
  organizationPays: string | null
  organizationEspecialidad: string | null
  nombreCompleto: string | null
  especialidadTexto: string | null
  fotoUrl: string | null
  codigoSeguridadUpdatedAt: string | null
  mpTokenConfigured: boolean
  mpTokenLast4: string | null
  twilioAuthTokenConfigured: boolean
  twilioAuthTokenLast4: string | null
  updateSettingsAction: (formData: FormData) => void
  openBillingPortalAction: () => void
  updateCategoriasNotasAction: (categorias: string[]) => Promise<{ ok: boolean; error?: string; categorias?: string[] }>
  updateCategoriasConFotoAction: (categorias: string[]) => Promise<{ ok: boolean; error?: string; categorias?: string[] }>
  updateMpAccessTokenAction: (token: string) => Promise<{ ok: boolean; error?: string; nickname?: string; email?: string; last4?: string }>
  updateTwilioSettingsAction: (
    subaccountSid: string,
    whatsappNumber: string,
    authToken: string
  ) => Promise<{ ok: boolean; error?: string; last4?: string }>
}) {
  const t = useTranslations('dashboard.settings')
  const patientLangue: 'es' | 'pt' = organizationLangue === 'pt' ? 'pt' : 'es'
  const [fotoPreview, setFotoPreview] = useState<string | null>(fotoUrl)
  const [previewName, setPreviewName] = useState(nombreCompleto ?? '')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      setFotoPreview(URL.createObjectURL(file))
      // Synchroniser avec l'input caché pour que le FormData du submit le récupère
      if (fileInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        fileInputRef.current.files = dt.files
      }
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400'

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
      {hasStripeCustomer && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{t('subscription')}</p>
              <p className="text-sm text-gray-500">{t('statusLabel')} : {subscriptionStatut}</p>
            </div>
            <form action={openBillingPortalAction}>
              <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                {t('manageSubscription')}
              </button>
            </form>
          </div>
        </Card>
      )}
      <form action={updateSettingsAction} className="space-y-6">
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('groupProfile')}</h2>
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={previewName || '?'} photoUrl={fotoPreview} size={56} />
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              className={`rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors ${
                isDragging ? 'border-[#6926D2] bg-violet-50' : 'border-gray-300'
              }`}
            >
              <label htmlFor="foto" className="cursor-pointer text-sm font-medium text-gray-700">
                {isDragging ? 'Suelta la imagen aquí' : t('profilePhoto')}
              </label>
              <p className="mt-0.5 text-xs text-gray-400">o arrastra una imagen aquí</p>
              <input
                ref={fileInputRef}
                id="foto"
                name="foto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('fullName')}</label>
              <input
                name="nombre_completo"
                defaultValue={nombreCompleto ?? ''}
                placeholder={t('fullNamePlaceholder')}
                onChange={(e) => setPreviewName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('especialidadTexto')}</label>
              <input
                name="especialidad_texto"
                defaultValue={especialidadTexto ?? ''}
                placeholder={t('especialidadTextoPlaceholder')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('organizacionEspecialidad')}
                <InfoTooltip text={t('organizacionEspecialidadInfo')} />
              </label>
              <select
                name="organizacion_especialidad"
                defaultValue={organizationEspecialidad ?? ''}
                className={inputClass}
              >
                <option value="">{t('organizacionEspecialidadVacio')}</option>
                <option value="estetica_dermato">{t('organizacionEspecialidadEstetica')}</option>
                <option value="clinica_medica">{t('organizacionEspecialidadClinica')}</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('groupBilling')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('paymentDelay')}
                <InfoTooltip text="Tiempo máximo que tiene el paciente para pagar antes de que la cita se cancele automáticamente." />
              </label>
              <select name="delai_paiement_h" defaultValue={settings?.delai_paiement_h ?? 6} className={inputClass}>
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('noticeDelay')}
                <InfoTooltip text="Tiempo después del cual se envía un recordatorio de pago si el paciente aún no pagó." />
              </label>
              <select name="delai_aviso_h" defaultValue={settings?.delai_aviso_h ?? 6} className={inputClass}>
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('reminderDelay')}
                <InfoTooltip text="Tiempo antes de la cita en que se envía un recordatorio automático al paciente." />
              </label>
              <select name="delai_rappel_h" defaultValue={settings?.delai_rappel_h ?? 24} className={inputClass}>
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('depositAmount')}
                <InfoTooltip text="Monto que el paciente paga por adelantado al reservar la cita." />
              </label>
              <input name="monto_acompte" type="number" step="0.01" min="0" defaultValue={settings?.monto_acompte ?? undefined} className={inputClass} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('totalCost')}
                <InfoTooltip text="Tarifa fija de la consulta. Útil si tu servicio tiene un precio único (ej. psicología)." />
              </label>
              <input name="costo_total" type="number" step="0.01" min="0" defaultValue={settings?.costo_total ?? ''} placeholder={t('totalCostPlaceholder')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('currency')}</label>
              <select name="monnaie" defaultValue={settings?.monnaie ?? 'PEN'} className={inputClass}>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{t(`currencyOptions.${code}`)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('groupIntegrations')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('clinicAddress')}</label>
              <input name="adresse" defaultValue={organizationAdresse ?? ''} placeholder={t('clinicAddressPlaceholder')} className={inputClass} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('calendlyUrl')}
                <InfoTooltip text="Enlace de tu página de reservas de Calendly, usado para sincronizar tu disponibilidad." />
              </label>
              <input name="calendly_url" type="url" defaultValue={settings?.calendly_url ?? ''} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('unipileAccountId')}</label>
              <input name="unipile_account_id" defaultValue={settings?.unipile_account_id ?? ''} className={inputClass} />
            </div>
            {settings?.canal_whatsapp_provider === 'twilio' && (
              <TwilioSettingsFields
                subaccountSid={settings.twilio_subaccount_sid}
                whatsappNumber={settings.twilio_whatsapp_number}
                authTokenConfigured={twilioAuthTokenConfigured}
                authTokenLast4={twilioAuthTokenLast4}
                updateTwilioSettingsAction={updateTwilioSettingsAction}
              />
            )}
            <div>
              <MercadoPagoTokenField
                mpTokenConfigured={mpTokenConfigured}
                mpTokenLast4={mpTokenLast4}
                pays={organizationPays}
                updateMpAccessTokenAction={updateMpAccessTokenAction}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                {t('mpWebhookUrl')}
                <InfoTooltip text="URL que MercadoPago usa para avisarte automáticamente cuando un paciente paga." />
              </label>
              <input name="mp_notification_url" defaultValue={settings?.mp_notification_url ?? ''} className={inputClass} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('groupChannels')}</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input name="canal_email" type="checkbox" defaultChecked={settings?.canal_email ?? false} className="accent-brand-600" />
              <span className="text-sm text-gray-700">{t('emailActive')}</span>
            </label>
            <label className="flex items-center gap-2">
              <input name="canal_whatsapp" type="checkbox" defaultChecked={settings?.canal_whatsapp ?? false} className="accent-brand-600" />
              <span className="text-sm text-gray-700">{t('whatsappActive')}</span>
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800">{t('messageTemplate')}</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">{t('messageTemplateDesc')}</p>
          <div className="space-y-4">
            {NOTIFICATION_TYPES.map((type) => {
              const currentVariant =
                (settings?.variantes_mensaje as Record<string, string> | null)?.[type] === 'calido' ? 'calido' : 'standard'
              return (
                <fieldset key={type}>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">{NOTIFICATION_TYPE_LABELS[patientLangue][type]}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VARIANT_IDS.map((variantId: VariantId) => (
                      <label
                        key={variantId}
                        className="block rounded-lg border border-gray-200 p-3 text-sm cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                      >
                        <span className="flex items-center gap-2 font-medium text-gray-800">
                          <input
                            type="radio"
                            name={`variante_${type}`}
                            value={variantId}
                            defaultChecked={currentVariant === variantId}
                            className="accent-brand-600"
                          />
                          {VARIANT_LABELS[patientLangue][variantId]}
                        </span>
                        <p className="mt-2 text-xs text-gray-500 whitespace-pre-line">
                          {getPreview(type, variantId, patientLangue)}
                        </p>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            })}
            {(() => {
              const currentControlVariant = settings?.variante_control_recall === 'calido' ? 'calido' : 'standard'
              return (
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">{CONTROL_RECALL_LABEL[patientLangue]}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VARIANT_IDS.map((variantId: VariantId) => (
                      <label
                        key={variantId}
                        className="block rounded-lg border border-gray-200 p-3 text-sm cursor-pointer hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                      >
                        <span className="flex items-center gap-2 font-medium text-gray-800">
                          <input
                            type="radio"
                            name="variante_control_recall"
                            value={variantId}
                            defaultChecked={currentControlVariant === variantId}
                            className="accent-brand-600"
                          />
                          {VARIANT_LABELS[patientLangue][variantId]}
                        </span>
                        <p className="mt-2 text-xs text-gray-500 whitespace-pre-line">
                          {getControlRecallPreview(variantId, patientLangue)}
                        </p>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            })()}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="control_recall_anticipacion_dias">
                Anticipación del recordatorio de control (días)
              </label>
              <InfoTooltip text="Cuántos días antes de la fecha de control se envía la invitación. Cuanto más largo este plazo, más lejos debes mantener abierta tu disponibilidad de Calendly — si no, la invitación llega sin horarios disponibles." />
            </div>
            <input
              id="control_recall_anticipacion_dias"
              name="control_recall_anticipacion_dias"
              type="number"
              min={0}
              max={90}
              defaultValue={settings?.control_recall_anticipacion_dias ?? 14}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </Card>

        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-700 active:scale-[0.98]">
          {t('save')}
        </button>
      </form>

      <SeguridadNotasCard lastUpdated={codigoSeguridadUpdatedAt} />

      <CategoriasNotasCard
        initial={settings?.categorias_notas ?? []}
        initialConFoto={settings?.categorias_con_foto ?? []}
        updateCategoriasNotasAction={updateCategoriasNotasAction}
        updateCategoriasConFotoAction={updateCategoriasConFotoAction}
      />
    </div>
  )
}
