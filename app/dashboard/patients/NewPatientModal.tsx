'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface CreateResult {
  id?: string
  error?: string
  duplicatePatientId?: string
}

export default function NewPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('dashboard.patients.nuevo')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicatePatientId, setDuplicatePatientId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDuplicatePatientId(null)

    const nombreTrim = nombre.trim()
    const emailTrim = email.trim()
    const telefonoTrim = telefono.trim()
    if (!nombreTrim) {
      setError(t('errorFaltaNombre'))
      return
    }
    if (!emailTrim && !telefonoTrim) {
      setError(t('errorFaltaEmailTelefono'))
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreTrim, email: emailTrim || null, telefono: telefonoTrim || null }),
    })
    const data: CreateResult = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      if (data.duplicatePatientId) setDuplicatePatientId(data.duplicatePatientId)
      setError(data.error ?? t('errorCrear'))
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">{t('title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeLabel')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('labelNombre')}</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('labelEmail')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('labelTelefono')}</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
            />
          </div>
          <p className="text-xs text-gray-400">{t('hintEmailOrTelefono')}</p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <p>{error}</p>
              {duplicatePatientId && (
                <Link href={`/dashboard/patients/${duplicatePatientId}`} className="mt-1 inline-block font-medium underline">
                  {t('verFichaExistente')}
                </Link>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-300 disabled:opacity-50"
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? t('submitting') : t('submitButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
