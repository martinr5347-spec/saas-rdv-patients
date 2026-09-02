import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jakarta',
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${jakarta.variable} font-[family-name:var(--font-jakarta)]`}>{children}</div>
}
