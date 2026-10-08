'use client'

import Link from 'next/link'
import { CalendarIcon, UsersIcon, ShieldIcon } from '@/components/layout/icons'

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

function ProfileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path strokeLinecap="round" d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path strokeLinecap="round" d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21" />
    </svg>
  )
}

function CelebrationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
      <path strokeLinecap="round" d="M19 15.5v3M17.5 17h3M4 4.5v2M3 5.5h2" />
    </svg>
  )
}

type Onboarding = {
  profileDone: boolean
  clinicDone: boolean
  patientDone: boolean
  appointmentDone: boolean
}

const GREETING_TEXT: Record<'morning' | 'afternoon' | 'night', string> = {
  morning: 'Buenos días',
  afternoon: 'Buenas tardes',
  night: 'Buenas noches',
}

export default function DashboardHomeView({
  displayName,
  greeting,
  onboarding,
  completedSteps,
  totalSteps,
  upcomingCount,
  patientCount,
}: {
  displayName: string
  greeting: 'morning' | 'afternoon' | 'night'
  onboarding: Onboarding
  completedSteps: number
  totalSteps: number
  upcomingCount: number
  patientCount: number
}) {
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)
  const allDone = completedSteps === totalSteps

  const steps: Array<{
    key: keyof Onboarding
    label: string
    description: string
    href: string
    icon: React.ReactNode
  }> = [
    {
      key: 'profileDone',
      label: 'Completa tu perfil',
      description: 'Añade tu nombre completo y especialidad',
      href: '/dashboard/settings',
      icon: <ProfileIcon className="h-5 w-5" />,
    },
    {
      key: 'clinicDone',
      label: 'Configura tu clínica',
      description: 'Completa la dirección y datos de tu clínica',
      href: '/dashboard/settings',
      icon: <BuildingIcon className="h-5 w-5" />,
    },
    {
      key: 'patientDone',
      label: 'Añade tu primer paciente',
      description: 'Registra el primer paciente de tu agenda',
      href: '/dashboard/patients',
      icon: <UsersIcon className="h-5 w-5" />,
    },
    {
      key: 'appointmentDone',
      label: 'Agenda tu primera cita',
      description: 'Crea tu primera cita médica o estética',
      href: '/dashboard/appointments',
      icon: <CalendarIcon className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6926D2] to-[#3c008a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-300/25 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-pulse" />
            Configuración inicial: {completedSteps} de {totalSteps} completados
          </div>
          <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
            ¡{GREETING_TEXT[greeting]}, {displayName}!
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            Tu espacio está listo. Completa los pasos a continuación para comenzar a gestionar citas y pacientes.
          </p>
        </div>
      </div>

      {/* Primeros pasos */}
      <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[#6926D2]">
              <CheckIcon className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900">Primeros pasos</h2>
          </div>
          <p className="text-sm text-gray-500">
            {completedSteps} de {totalSteps} completados ({progressPercent}%)
          </p>
        </div>

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#6926D2] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {allDone ? (
          <div className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-4 text-[#6926D2]">
            <CelebrationIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium">¡Todo listo! Tu clínica está configurada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => {
              const done = onboarding[step.key]
              return (
                <div
                  key={step.key}
                  className={`flex flex-col gap-3 rounded-xl p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                    done ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-[#6926D2] text-white' : 'bg-violet-100 text-[#6926D2]'
                      }`}
                    >
                      {done ? <CheckIcon className="h-5 w-5" /> : step.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {done ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                        Completado
                      </span>
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-xl bg-gray-200 px-4 py-2 text-xs font-medium text-gray-400"
                      >
                        Registrado
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={step.href}
                      className="shrink-0 rounded-xl bg-[#6926D2] px-4 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-[#5a20b8]"
                    >
                      Configurar →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#6926D2]">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">{upcomingCount > 0 ? upcomingCount : '-'}</p>
          <p className="text-sm text-gray-500">Citas programadas</p>
          <p className="text-xs text-gray-400">desde hoy</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#6926D2]">
            <UsersIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">{patientCount > 0 ? patientCount : '-'}</p>
          <p className="text-sm text-gray-500">Pacientes registrados</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#6926D2]">
            <ShieldIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">Activo</p>
          <p className="text-sm text-gray-500">Plan Núcleo</p>
          <p className="text-xs text-gray-400">Período de prueba</p>
        </div>
      </div>
    </div>
  )
}
