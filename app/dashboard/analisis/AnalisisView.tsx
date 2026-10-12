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

function growthLabel(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'Nuevo' : '—'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export default function AnalisisView({ appointments, manuales }: { appointments: AppointmentRow[]; manuales: ManualRow[] }) {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const previousYear = currentYear - 1

  // Dernier mois "complet" : le mois en cours est exclu des séries sauf si on est au dernier jour du mois
  const lastDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const lastCompleteMonthIndex = now.getUTCDate() >= lastDayOfMonth ? now.getUTCMonth() : now.getUTCMonth() - 1

  const hasAnyData = appointments.length > 0 || manuales.length > 0

  const { revenueData, citasData, presenceRate, kpis } = useMemo(() => {
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

    const buildSeries = (year: number, maxMonthIndex: number) =>
      MESES.map((label, i) => {
        const key = `${year}-${i}`
        const entry = byMonth[key] ?? { revenue: 0, citas: 0, presentes: 0, marcadas: 0 }
        const dentroDeRango = i <= maxMonthIndex
        return {
          mes: label,
          revenue: dentroDeRango ? Math.round(entry.revenue * 100) / 100 : null,
          citas: dentroDeRango ? entry.citas : null,
          presenceRate: dentroDeRango && entry.marcadas > 0 ? Math.round((entry.presentes / entry.marcadas) * 100) : null,
          _raw: entry,
        }
      })

    // Année en cours : tronquée au dernier mois complet. Année précédente : les 12 mois (déjà tous passés).
    const currentSeries = buildSeries(currentYear, lastCompleteMonthIndex)
    const previousSeries = buildSeries(previousYear, 11)

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
    const presenceRate = MESES.map((label, i) => ({
      mes: label,
      [`${currentYear}`]: currentSeries[i].presenceRate,
      [`${previousYear}`]: previousSeries[i].presenceRate,
    }))

    // KPI : somme sur les mois complets de l'année en cours vs mêmes mois l'an dernier (comparaison équitable)
    const revenueCurrentYTD = currentSeries.slice(0, lastCompleteMonthIndex + 1).reduce((s, m) => s + (m.revenue ?? 0), 0)
    const revenuePreviousYTD = previousSeries.slice(0, lastCompleteMonthIndex + 1).reduce((s, m) => s + (m.revenue ?? 0), 0)
    const citasCurrentYTD = currentSeries.slice(0, lastCompleteMonthIndex + 1).reduce((s, m) => s + (m.citas ?? 0), 0)
    const citasPreviousYTD = previousSeries.slice(0, lastCompleteMonthIndex + 1).reduce((s, m) => s + (m.citas ?? 0), 0)

    const presenceEntries = currentSeries.slice(0, lastCompleteMonthIndex + 1).filter((m) => m.presenceRate !== null)
    const avgPresence = presenceEntries.length > 0
      ? Math.round(presenceEntries.reduce((s, m) => s + (m.presenceRate ?? 0), 0) / presenceEntries.length)
      : null

    const kpis = {
      revenueGrowth: growthLabel(revenueCurrentYTD, revenuePreviousYTD),
      citasGrowth: growthLabel(citasCurrentYTD, citasPreviousYTD),
      avgPresence,
    }

    return { revenueData, citasData, presenceRate, kpis }
  }, [appointments, manuales, currentYear, previousYear, lastCompleteMonthIndex])

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-800">Análisis</h1>
        <Card>
          <div className="py-10 text-center">
            <p className="text-gray-600 font-medium">Aún no hay suficiente actividad para mostrar un análisis.</p>
            <p className="text-sm text-gray-400 mt-1">Vuelve aquí después de registrar tus primeras citas y pagos.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Análisis</h1>
      <p className="text-sm text-gray-500 -mt-4">Comparación mes a mes, {currentYear} vs {previousYear}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Crecimiento ingresos</p>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{kpis.revenueGrowth}</p>
          <p className="text-xs text-gray-400 mt-0.5">vs mismo período {previousYear}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Crecimiento citas</p>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{kpis.citasGrowth}</p>
          <p className="text-xs text-gray-400 mt-0.5">vs mismo período {previousYear}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Asistencia promedio</p>
          <p className="text-2xl font-semibold text-gray-800 mt-1">{kpis.avgPresence !== null ? `${kpis.avgPresence}%` : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{currentYear}, meses completos</p>
        </Card>
      </div>

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
        <p className="text-xs text-gray-400 mt-2">* El mes en curso se muestra una vez finalizado, para no distorsionar la comparación.</p>
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
        <p className="text-xs text-gray-400 mt-2">* El mes en curso se muestra una vez finalizado, para no distorsionar la comparación.</p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Tasa de asistencia por mes</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={presenceRate}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={`${previousYear}`} stroke="#b4b2a9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey={`${currentYear}`} stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2">* El mes en curso se muestra una vez finalizado, para no distorsionar la comparación.</p>
      </Card>
    </div>
  )
}
