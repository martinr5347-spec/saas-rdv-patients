import React, { ReactNode } from 'react'

interface WrapperProps {
  children: ReactNode
  className?: string
}

interface CellProps extends Omit<WrapperProps, 'children'> {
  children?: ReactNode
  isHeader?: boolean
  colSpan?: number
}

// 'data-tour' (cf. components/onboarding/PageTour.tsx) transmis tel quel a la div racine -- jamais
// consomme ici.
export function TableContainer({ children, 'data-tour': dataTour }: WrapperProps & { 'data-tour'?: string }) {
  return (
    <div data-tour={dataTour} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="max-w-full overflow-x-auto">{children}</div>
    </div>
  )
}

export function Table({ children, className = '' }: WrapperProps) {
  return <table className={`min-w-full ${className}`}>{children}</table>
}

export function TableHeader({ children, className = '' }: WrapperProps) {
  return <thead className={`bg-gray-50 border-b border-gray-200 ${className}`}>{children}</thead>
}

export function TableBody({ children, className = '' }: WrapperProps) {
  return <tbody className={`divide-y divide-gray-100 ${className}`}>{children}</tbody>
}

export function TableRow({ children, className = '' }: WrapperProps) {
  return <tr className={`hover:bg-gray-50 ${className}`}>{children}</tr>
}

export function TableCell({ children, isHeader = false, colSpan, className = '' }: CellProps) {
  const Tag = isHeader ? 'th' : 'td'
  const base = isHeader
    ? 'px-5 py-3 text-left text-theme-xs font-medium text-gray-500 uppercase tracking-wide'
    : 'px-5 py-3 text-sm text-gray-700'
  return (
    <Tag colSpan={colSpan} className={`${base} ${className}`}>
      {children}
    </Tag>
  )
}
