// Icônes inline partagées entre /login et /register (pas de nouvelle dépendance).

export function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 6.5 8 6 8-6" />
    </svg>
  )
}

export function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path strokeLinecap="round" d="M8 11V7.5a4 4 0 1 1 8 0V11" />
    </svg>
  )
}
