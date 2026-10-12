'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import Card from '@/components/ui/Card'

interface AppointmentRow {
  fecha_cita: string
  statut: string
  monto_acompte: number
  montant_consultation: number | null
  presente: boolean | null
}

interface ManualRow {
  fecha: string
  monto: number
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function AnalisisView({ appointments, manuales }: { appointments: AppointmentRow[]; manuales: ManualRow[] }) {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const previousYear = currentYear - 1

  const { revenueData, citasData, presenceRate } = useMemo(() => {
    const byMonth: Record<string, { revenue: number; citas: number; presentes: number; marcadas: number }> = {}

    const addRevenue = (dateStr: string, amount: number) => {
      const d = new Date(dateStr)
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      if (!byMonth[key]) byMonth[key] = { revenue: 0, citas: 0, presentes: 0, marcadas: 0 }
      byMonth[key].revenue += amount
    }

    for (const a of appointments) {
      const d = new Date(a.fecha_cita)
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      if (!byMonth[key]) byMonth[key] = { revenue: 0, citas: 0, presentes: 0, marcadas: 0 }
      byMonth[key].citas += 1
      if (a.statut === 'pagado') byMonth[key].revenue += Number(a.monto_acompte)
      if (a.montant_consultation) byMonth[key].revenue += Number(a.montant_consultation)
      if (a.presente !== null) {
        byMonth[key].marcadas += 1
        if (a.presente) byMonth[key].presentes += 1
      }
    }
    for (const m of manuales) addRevenue(m.fecha, Number(m.monto))

    const buildSeries = (year: number) =>
      MESES.map((label, i) => {
        const key = `${year}-${i}`
        const entry = byMonth[key] ?? { revenue: 0, citas: 0, presentes: 0, marcadas: 0 }
        return {
          mes: label,
          revenue: Math.round(entry.revenue * 100) / 100,
          citas: entry.citas,
          presenceRate: entry.marcadas > 0 ? Math.round((entry.presentes / entry.marcadas) * 100) : null,
        }
      })

    const currentSeries = buildSeries(currentYear)
    const previousSeries = buildSeries(previousYear)

    const revenueData = MESES.map((label, i) => ({
      mes: label,
      [`${currentYear}`]: currentSeries[i].revenue,
      [`${previousYear}`]: previousSeries[i].revenue,
    }))
    const citasData = MESES.map((label, i) => ({
      mes: label,
      [`${currentYear}`]: currentSeries[i].citas,
      [`${previousYear}`]: previousSeries[i].citas,
    }))
    const presenceRate = currentSeries.map((s) => ({ mes: s.mes, tasa: s.presenceRate }))

    return { revenueData, citasData, presenceRate }
  }, [appointments, manuales, currentYear, previousYear])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Análisis</h1>
      <p className="text-sm text-gray-500 -mt-4">Comparación mes a mes, {currentYear} vs {previousYear}</p>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Ingresos por mes</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey={`${previousYear}`} fill="#d3d1c7" radius={[4, 4, 0, 0]} />
            <Bar dataKey={`${currentYear}`} fill="#6926D2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Citas por mes</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={citasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey={`${previousYear}`} fill="#d3d1c7" radius={[4, 4, 0, 0]} />
            <Bar dataKey={`${currentYear}`} fill="#0A1422" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Tasa de asistencia — {currentYear}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={presenceRate}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip />
            <Line type="monotone" dataKey="tasa" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
