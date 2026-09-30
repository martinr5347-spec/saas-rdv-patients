'use client'

import { useTranslations } from 'next-intl'
import StatCard from '@/components/ui/StatCard'
import { CalendarIcon } from '@/components/layout/icons'

export default function DashboardHomeView({
  total,
  pending,
  paid,
}: {
  total: number
  pending: number
  paid: number
}) {
  const t = useTranslations('dashboard.home')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">{t('title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('upcoming')} value={total} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label={t('pendingPayment')} value={pending} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label={t('paid')} value={paid} icon={<CalendarIcon className="h-5 w-5" />} />
      </div>
    </div>
  )
}
