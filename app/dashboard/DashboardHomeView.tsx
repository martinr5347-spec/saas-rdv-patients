'use client'

import { useTranslations } from 'next-intl'
import StatCard from '@/components/ui/StatCard'
import { CalendarIcon } from '@/components/layout/icons'

export default function DashboardHomeView({
  displayName,
  greeting,
  total,
  pending,
  paid,
}: {
  displayName: string
  greeting: 'morning' | 'afternoon' | 'night'
  total: number
  pending: number
  paid: number
}) {
  const t = useTranslations('dashboard.home')

  const greetingKey = {
    morning: 'greetingMorning',
    afternoon: 'greetingAfternoon',
    night: 'greetingNight',
  }[greeting]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{t(greetingKey, { name: displayName })}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('title')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('upcoming')} value={total} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label={t('pendingPayment')} value={pending} icon={<CalendarIcon className="h-5 w-5" />} />
        <StatCard label={t('paid')} value={paid} icon={<CalendarIcon className="h-5 w-5" />} />
      </div>
    </div>
  )
}
