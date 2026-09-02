import React from 'react'

export default function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {icon && <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-800">{value}</p>
    </div>
  )
}
