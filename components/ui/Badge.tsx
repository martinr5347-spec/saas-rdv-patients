import React from 'react'

type BadgeColor = 'brand' | 'success' | 'error' | 'warning' | 'gray'

const COLOR_CLASSES: Record<BadgeColor, string> = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-success-50 text-success-700',
  error: 'bg-error-50 text-error-700',
  warning: 'bg-warning-50 text-warning-700',
  gray: 'bg-gray-100 text-gray-700',
}

export default function Badge({ color = 'gray', children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium capitalize ${COLOR_CLASSES[color]}`}>
      {children}
    </span>
  )
}
