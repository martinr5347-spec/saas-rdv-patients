'use client'

import { useState } from 'react'
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
} from '@/lib/dispatcher/templateVariants'

const NOTIFICATION_TYPES: NotificationType[] = ['confirmation', 'aviso', 'pago', 'anulacion', 'recordatorio']
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
  mp_access_token: string | null
  mp_notification_url: string | null
  canal_email: boolean | null
  canal_whatsapp: boolean | null
  variantes_mensaje: unknown
}

function SeguridadNotasCard({ lastUpdated }: { lastUpdated: string | null }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const codigo = digits.join('')
    if (codigo.length !== 4) {
      toast.error('Ingresa un código de 4 dígitos')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users/me/security-code', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
    if (res.ok) {
      toast.success('Código actualizado')
      setDigits(['', '', '', ''])
    } else {
      toast.error('Error al guardar el código')
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {digits.map((d, i) => (
            <input
              key={i}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                const next = [...digits]
                next[i] = val
                setDigits(next)
              }}
              className="h-11 w-10 rounded-lg border border-gray-200 text-center font-semibold focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5a1fb0] disabled:opacity-50"
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
  nombreCompleto,
  especialidadTexto,
  fotoUrl,
  codigoSeguridadUpdatedAt,
  updateSettingsAction,
  openBillingPortalAction,
}: {
  settings: OrgSettings | null
  subscriptionStatut: string | null
  hasStripeCustomer: boolean
  organizationLangue: string | null
  organizationAdresse: string | null
  nombreCompleto: string | null
  especialidadTexto: string | null
  fotoUrl: string | null
  codigoSeguridadUpdatedAt: string | null
  updateSettingsAction: (formData: FormData) => void
  openBillingPortalAction: () => void
}) {
  const t = useTranslations('dashboard.settings')
  const patientLangue: 'es' | 'pt' = organizationLangue === 'pt' ? 'pt' : 'es'
  const [fotoPreview, setFotoPreview] = useState<string | null>(fotoUrl)
  const [previewName, setPreviewName] = useState(nombreCompleto ?? '')

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
            <div>
              <label htmlFor="foto" className="inline-block cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {t('profilePhoto')}
              </label>
              <input
                id="foto"
                name="foto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setFotoPreview(URL.createObjectURL(file))
                }}
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
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('groupBilling')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('paymentDelay')}</label>
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
              <label className="block text-sm font-medium text-gray-700">{t('noticeDelay')}</label>
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
              <label className="block text-sm font-medium text-gray-700">{t('reminderDelay')}</label>
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
              <label className="block text-sm font-medium text-gray-700">{t('depositAmount')}</label>
              <input name="monto_acompte" type="number" step="0.01" min="0" defaultValue={settings?.monto_acompte ?? undefined} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('totalCost')}</label>
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
              <label className="block text-sm font-medium text-gray-700">{t('calendlyUrl')}</label>
              <input name="calendly_url" type="url" defaultValue={settings?.calendly_url ?? ''} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('unipileAccountId')}</label>
              <input name="unipile_account_id" defaultValue={settings?.unipile_account_id ?? ''} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('mpToken')}</label>
              <input name="mp_access_token" defaultValue={settings?.mp_access_token ?? ''} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('mpWebhookUrl')}</label>
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
          </div>
        </Card>

        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {t('save')}
        </button>
      </form>

      <SeguridadNotasCard lastUpdated={codigoSeguridadUpdatedAt} />
    </div>
  )
}
