'use client'

import { useEffect, useRef, useState } from 'react'

// Page publique mobile (QR scanne depuis l'ordinateur, cf. prompt notas-foto-transfer-qr) --
// AUCUNE donnee patient visible ici (securite si le lien fuit), juste le strict necessaire pour
// prendre une photo et l'envoyer. Entierement client : la validite du jeton (et la langue de
// l'organisation, seule donnee non sensible necessaire pour l'affichage) sont lues via l'API
// publique dediee, jamais via un acces direct a la base depuis cette page.

const TEXT = {
  es: {
    title: 'Enviar foto',
    loading: 'Verificando enlace...',
    invalid: 'Este enlace ya no es válido. Pide uno nuevo desde la computadora.',
    internetWarning: 'Asegúrate de tener conexión a internet (WiFi o datos) en este celular para poder enviar la foto.',
    takePhoto: 'Tomar foto',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: '¡Foto enviada!',
    takeAnother: 'Tomar otra foto',
    cappedReached: 'Ya enviaste el máximo de fotos permitidas para esta nota.',
    errorGeneric: 'No se pudo enviar la foto. Intenta de nuevo.',
  },
  pt: {
    title: 'Enviar foto',
    loading: 'Verificando link...',
    invalid: 'Este link não é mais válido. Peça um novo a partir do computador.',
    internetWarning: 'Certifique-se de ter conexão à internet (WiFi ou dados) neste celular para poder enviar a foto.',
    takePhoto: 'Tirar foto',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: 'Foto enviada!',
    takeAnother: 'Tirar outra foto',
    cappedReached: 'Você já enviou o máximo de fotos permitidas para esta nota.',
    errorGeneric: 'Não foi possível enviar a foto. Tente novamente.',
  },
}

type Langue = 'es' | 'pt'

export default function SubirFotoPage({ params }: { params: { token: string } }) {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [langue, setLangue] = useState<Langue>('es')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = TEXT[langue]

  useEffect(() => {
    fetch(`/api/public/photo-transfer/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        setValid(Boolean(data.valid))
        if (data.langue === 'pt') setLangue('pt')
        setRemaining(typeof data.remaining === 'number' ? data.remaining : null)
        setChecking(false)
      })
      .catch(() => {
        setValid(false)
        setChecking(false)
      })
  }, [params.token])

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError(null)
  }

  const takeAnother = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setSent(false)
    setError(null)
    fileInputRef.current?.click()
  }

  const enviar = async () => {
    if (!file) return
    setSending(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/public/photo-transfer/${params.token}`, { method: 'POST', body: formData })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) {
      if (res.status === 410) {
        setValid(false)
      } else {
        setError(data.error ?? t.errorGeneric)
      }
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setSent(true)
    setRemaining(typeof data.remaining === 'number' ? data.remaining : null)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-4 text-lg font-semibold text-gray-800">{t.title}</h1>

        {checking ? (
          <p className="text-sm text-gray-500">{t.loading}</p>
        ) : !valid ? (
          <p className="text-sm text-gray-600">{t.invalid}</p>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 flex-shrink-0">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a1.5 1.5 0 001.3 2.25h17.76a1.5 1.5 0 001.3-2.25L13.71 3.86a1.5 1.5 0 00-2.42 0z"
                />
              </svg>
              <p>{t.internetWarning}</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileSelected}
              className="hidden"
            />

            {remaining === 0 ? (
              <p className="text-sm text-gray-600">{t.cappedReached}</p>
            ) : sent ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-emerald-600">{t.sent}</p>
                {remaining !== null && remaining > 0 && (
                  <button
                    type="button"
                    onClick={takeAnother}
                    className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white hover:bg-[#5a1fb0]"
                  >
                    {t.takeAnother}
                  </button>
                )}
              </div>
            ) : previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-48 w-full rounded-lg object-cover" />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={enviar}
                  disabled={sending}
                  className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
                >
                  {sending ? t.sending : t.send}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-[#6926D2] py-3 text-sm font-medium text-white hover:bg-[#5a1fb0]"
              >
                {t.takePhoto}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
