'use client'

import { useState } from 'react'

type Step = 'archivo' | 'columnas' | 'vista_previa' | 'resultado'
type FieldKey = 'nombre' | 'email' | 'telefono' | 'fecha_nacimiento'

interface ParseData {
  headers: string[]
  suggestedMapping: Record<string, string | null>
  rows: Record<string, unknown>[]
  totalRows: number
  truncated: boolean
}

interface CommitResult {
  importados: number
  omitidosDuplicadosEnArchivo: number
  omitidosYaExistentes: number
  errores: { fila: number; motivo: string }[]
}

const FIELD_OPTIONS: { value: '' | FieldKey; label: string }[] = [
  { value: '', label: 'No importar esta columna' },
  { value: 'nombre', label: 'Nombre (obligatorio)' },
  { value: 'email', label: 'Email' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'fecha_nacimiento', label: 'Fecha de nacimiento' },
]

function mapRow(row: Record<string, unknown>, mapping: Record<string, string>) {
  const result: { nombre: string | null; email: string | null; telefono: string | null } = {
    nombre: null,
    email: null,
    telefono: null,
  }
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue
    const raw = row[header]
    const val = raw === undefined || raw === null ? '' : String(raw).trim()
    if (field === 'nombre') result.nombre = val || null
    if (field === 'email') result.email = val || null
    if (field === 'telefono') result.telefono = val || null
  }
  return result
}

export default function ImportPatientsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>('archivo')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseData, setParseData] = useState<ParseData | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setParsing(true)
    setParseError(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/patients/import/parse', { method: 'POST', body: formData })
    const data = await res.json()
    setParsing(false)
    if (!res.ok) {
      setParseError(data.error ?? 'Error al leer el archivo')
      return
    }
    setParseData(data)
    setMapping(data.suggestedMapping ?? {})
    setStep('columnas')
  }

  const hasNombreMapped = Object.values(mapping).includes('nombre')

  const commit = async () => {
    if (!parseData) return
    setCommitting(true)
    setCommitError(null)
    const rows = parseData.rows.map((row) => mapRow(row, mapping))
    const res = await fetch('/api/patients/import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setCommitting(false)
    if (!res.ok) {
      setCommitError(data.error ?? 'Error al importar')
      return
    }
    setResult(data)
    setStep('resultado')
  }

  const previewRows = parseData ? parseData.rows.slice(0, 5).map((row) => mapRow(row, mapping)) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Importar pacientes</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {step === 'archivo' && (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Sube un archivo Excel (.xlsx, .xls) o CSV con tus pacientes. Si no tienes uno listo, descarga la
                plantilla para empezar.
              </p>
              <a
                href="/api/patients/import/template"
                className="mb-4 inline-block text-sm font-medium text-[#6926D2] hover:underline"
              >
                Descargar plantilla
              </a>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center hover:border-[#6926D2]">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {fileName ?? 'Haz clic para elegir un archivo'}
                </span>
                <span className="text-xs text-gray-400">.xlsx, .xls o .csv -- máx. 5 MB</span>
              </label>
              {parsing && <p className="mt-3 text-sm text-gray-500">Leyendo archivo...</p>}
              {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}
            </div>
          )}

          {step === 'columnas' && parseData && (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Indica qué columna de tu archivo corresponde a cada dato. Al menos una columna debe asignarse a
                &quot;Nombre&quot;.
              </p>
              <div className="space-y-3">
                {parseData.headers.map((header) => (
                  <div key={header} className="flex items-center justify-between gap-3">
                    <span className="flex-1 truncate text-sm font-medium text-gray-700" title={header}>
                      {header}
                    </span>
                    <select
                      value={mapping[header] ?? ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                      className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#6926D2] focus:outline-none focus:ring-1 focus:ring-[#6926D2]"
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!hasNombreMapped && (
                <p className="mt-3 text-xs text-amber-600">Asigna una columna a &quot;Nombre&quot; para continuar.</p>
              )}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('archivo')}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-300"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setStep('vista_previa')}
                  disabled={!hasNombreMapped}
                  className="flex-1 rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {step === 'vista_previa' && parseData && (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                {parseData.totalRows} {parseData.totalRows === 1 ? 'fila detectada' : 'filas detectadas'}.
              </p>
              {parseData.truncated && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Tu archivo tiene más de 500 filas -- solo se importarán las primeras 500, puedes importar el resto
                  en una segunda vez.
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 font-medium text-gray-600">Nombre</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Email</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 text-gray-800">{row.nombre ?? '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.email ?? '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.telefono ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {commitError && <p className="mt-3 text-sm text-red-600">{commitError}</p>}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('columnas')}
                  disabled={committing}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-300 disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={commit}
                  disabled={committing}
                  className="flex-1 rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98] disabled:opacity-50"
                >
                  {committing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          )}

          {step === 'resultado' && result && (
            <div>
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-800">{result.importados} pacientes importados</p>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{result.omitidosDuplicadosEnArchivo} omitidos por estar duplicados en el archivo</p>
                <p>{result.omitidosYaExistentes} omitidos por ya existir en tu lista de pacientes</p>
              </div>
              {result.errores.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">{result.errores.length} filas con errores:</p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200">
                    {result.errores.map((e, i) => (
                      <p key={i} className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-600 last:border-0">
                        Fila {e.fila}: {e.motivo}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={onImported}
                className="mt-6 w-full rounded-xl bg-[#6926D2] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#5a1fb0] active:scale-[0.98]"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
