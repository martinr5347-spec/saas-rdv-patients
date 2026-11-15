'use client'

import { useEffect, useRef, useState } from 'react'

// Page publique mobile (QR scanne depuis l'ordinateur, cf. prompt notas-foto-transfer-qr) --
// AUCUNE donnee patient visible ici (securite si le lien fuit), juste le strict necessaire pour
// choisir une ou plusieurs photos et les envoyer. Entierement client : la validite du jeton (et la
// langue de l'organisation, seule donnee non sensible necessaire pour l'affichage) sont lues via
// l'API publique dediee, jamais via un acces direct a la base depuis cette page.

const TEXT = {
  es: {
    title: 'Enviar foto',
    loading: 'Verificando enlace...',
    invalid: 'Este enlace ya no es válido. Pide uno nuevo desde la computadora.',
    internetWarning: 'Asegúrate de tener conexión a internet (WiFi o datos) en este celular para poder enviar la foto.',
    pickPhotos: 'Elegir fotos',
    send: 'Enviar',
    sendCount: (n: number) => `Enviar (${n})`,
    sendingProgress: (current: number, total: number) => `Enviando ${current}/${total}...`,
    sent: '¡Foto enviada!',
    sendAnother: 'Enviar más fotos',
    cappedReached: 'Ya enviaste el máximo de fotos permitidas para esta nota.',
    truncatedToRemaining: (n: number) => `Solo se enviarán las primeras ${n}, ya llegaste al máximo.`,
    summaryPartial: (sent: number, total: number) => `${sent} de ${total} fotos enviadas.`,
    summaryFailed: (names: string) => `No se pudo enviar: ${names}.`,
    removePhoto: 'Quitar foto',
    errorGeneric: 'No se pudo enviar la foto. Intenta de nuevo.',
  },
  pt: {
    title: 'Enviar foto',
    loading: 'Verificando link...',
    invalid: 'Este link não é mais válido. Peça um novo a partir do computador.',
    internetWarning: 'Certifique-se de ter conexão à internet (WiFi ou dados) neste celular para poder enviar a foto.',
    pickPhotos: 'Escolher fotos',
    send: 'Enviar',
    sendCount: (n: number) => `Enviar (${n})`,
    sendingProgress: (current: number, total: number) => `Enviando ${current}/${total}...`,
    sent: 'Foto enviada!',
    sendAnother: 'Enviar mais fotos',
    cappedReached: 'Você já enviou o máximo de fotos permitidas para esta nota.',
    truncatedToRemaining: (n: number) => `Somente as primeiras ${n} serão enviadas, você já atingiu o máximo.`,
    summaryPartial: (sent: number, total: number) => `${sent} de ${total} fotos enviadas.`,
    summaryFailed: (names: string) => `Não foi possível enviar: ${names}.`,
    removePhoto: 'Remover foto',
    errorGeneric: 'Não foi possível enviar a foto. Tente novamente.',
  },
}

type Langue = 'es' | 'pt'

interface PendingPhoto {
  localId: string
  file: File
  previewUrl: string
}

interface SendSummary {
  sentCount: number
  total: number
  failedNames: string[]
}

export default function SubirFotoPage({ params }: { params: { token: string } }) {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [langue, setLangue] = useState<Langue>('es')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [truncatedMessage, setTruncatedMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendingProgress, setSendingProgress] = useState<{ current: number; total: number } | null>(null)
  const [summary, setSummary] = useState<SendSummary | null>(null)
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

  const revokePending = (photos: PendingPhoto[]) => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const limit = remaining ?? files.length
    const toKeep = files.slice(0, limit)
    setTruncatedMessage(files.length > toKeep.length ? t.truncatedToRemaining(toKeep.length) : null)

    revokePending(pendingPhotos)
    setPendingPhotos(toKeep.map((f) => ({ localId: crypto.randomUUID(), file: f, previewUrl: URL.createObjectURL(f) })))
    setError(null)
    setSummary(null)
  }

  const removePendingPhoto = (localId: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.localId !== localId)
    })
  }

  const sendAnother = () => {
    setSummary(null)
    setError(null)
    setTruncatedMessage(null)
    fileInputRef.current?.click()
  }

  const enviar = async () => {
    if (pendingPhotos.length === 0) return
    setSending(true)
    setError(null)
    const total = pendingPhotos.length
    let sentCount = 0
    const failedNames: string[] = []

    for (let i = 0; i < pendingPhotos.length; i++) {
      const photo = pendingPhotos[i]
      setSendingProgress({ current: i + 1, total })

      let res: Response
      try {
        const formData = new FormData()
        formData.append('file', photo.file)
        res = await fetch(`/api/public/photo-transfer/${params.token}`, { method: 'POST', body: formData })
      } catch {
        failedNames.push(photo.file.name)
        continue
      }

      if (res.status === 410) {
        // Jeton expire/annule en plein envoi -- on arrete tout, rien d'autre a tenter.
        revokePending(pendingPhotos)
        setPendingPhotos([])
        setSending(false)
        setSendingProgress(null)
        setValid(false)
        return
      }

      if (!res.ok) {
        failedNames.push(photo.file.name)
        continue
      }

      const data = await res.json().catch(() => ({}))
      sentCount++
      if (typeof data.remaining === 'number') {
        setRemaining(data.remaining)
        if (data.remaining <= 0) break
      }
    }

    revokePending(pendingPhotos)
    setPendingPhotos([])
    setSending(false)
    setSendingProgress(null)
    setTruncatedMessage(null)
    setSummary({ sentCount, total, failedNames })
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
              multiple
              onChange={handleFileSelected}
              className="hidden"
            />

            {summary ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-emerald-600">
                  {summary.failedNames.length === 0 && summary.total === 1 ? t.sent : t.summaryPartial(summary.sentCount, summary.total)}
                </p>
                {summary.failedNames.length > 0 && <p className="text-xs text-red-600">{t.summaryFailed(summary.failedNames.join(', '))}</p>}
                {remaining !== null && remaining > 0 && (
                  <button
                    type="button"
                    onClick={sendAnother}
                    className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white hover:bg-[#5a1fb0]"
                  >
                    {t.sendAnother}
                  </button>
                )}
              </div>
            ) : remaining === 0 ? (
              <p className="text-sm text-gray-600">{t.cappedReached}</p>
            ) : pendingPhotos.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="grid w-full grid-cols-3 gap-2">
                  {pendingPhotos.map((photo) => (
                    <div key={photo.localId} className="group relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.previewUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                      {!sending && (
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(photo.localId)}
                          aria-label={t.removePhoto}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {truncatedMessage && <p className="text-xs text-amber-600">{truncatedMessage}</p>}
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={enviar}
                  disabled={sending}
                  className="w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white hover:bg-[#5a1fb0] disabled:opacity-50"
                >
                  {sending && sendingProgress
                    ? t.sendingProgress(sendingProgress.current, sendingProgress.total)
                    : pendingPhotos.length === 1
                      ? t.send
                      : t.sendCount(pendingPhotos.length)}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-[#6926D2] py-3 text-sm font-medium text-white hover:bg-[#5a1fb0]"
              >
                {t.pickPhotos}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
