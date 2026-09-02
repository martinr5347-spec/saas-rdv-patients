import React from 'react'

interface CardProps {
  title?: string
  desc?: string
  className?: string
  children: React.ReactNode
}

export default function Card({ title, desc, className = '', children }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>
      {title && (
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800">{title}</h3>
          {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
        </div>
      )}
      <div className={title ? 'p-4 border-t border-gray-100 sm:p-6' : 'p-4 sm:p-6'}>{children}</div>
    </div>
  )
}
