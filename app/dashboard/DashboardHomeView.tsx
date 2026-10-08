'use client'

import Link from 'next/link'
import { CalendarIcon, UsersIcon, ShieldIcon, CashIcon } from '@/components/layout/icons'

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

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  )
}

type Onboarding = {
  profileDone: boolean
  clinicDone: boolean
  patientDone: boolean
  appointmentDone: boolean
}

type TodayAppointment = {
  id: string
  horaCita: string
  statut: string
  patientName: string
}

type WeekStats = {
  appointments: number
  patients: number
  confirmedPct: number
  deltaVsLastWeek: number
}

const GREETING_TEXT: Record<'morning' | 'afternoon' | 'night', string> = {
  morning: 'Buenos días',
  afternoon: 'Buenas tardes',
  night: 'Buenas noches',
}

const STATUT_CONFIG: Record<string, { dot: string; badgeBg: string; badgeText: string; label: string }> = {
  pendiente: { dot: 'bg-[#D97706]', badgeBg: 'bg-amber-50', badgeText: 'text-[#D97706]', label: 'Pendiente' },
  confirmado: { dot: 'bg-[#059669]', badgeBg: 'bg-green-50', badgeText: 'text-[#059669]', label: 'Confirmado' },
  en_curso: { dot: 'bg-[#6926D2]', badgeBg: 'bg-violet-100', badgeText: 'text-[#6926D2]', label: 'En curso' },
  pagado: { dot: 'bg-[#059669]', badgeBg: 'bg-green-50', badgeText: 'text-[#059669]', label: 'Pagado' },
  anulado: { dot: 'bg-gray-300', badgeBg: 'bg-gray-100', badgeText: 'text-gray-500', label: 'Anulado' },
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function formatHora(hora: string): string {
  return hora ? hora.slice(0, 5) : '--:--'
}

export default function DashboardHomeView({
  displayName,
  greeting,
  onboarding,
  completedSteps,
  totalSteps,
  upcomingCount,
  patientCount,
  todayAppointments,
  weekStats,
  todayLabel,
}: {
  displayName: string
  greeting: 'morning' | 'afternoon' | 'night'
  onboarding: Onboarding
  completedSteps: number
  totalSteps: number
  upcomingCount: number
  patientCount: number
  todayAppointments: TodayAppointment[]
  weekStats: WeekStats
  todayLabel: string
}) {
  if (completedSteps === totalSteps) {
    return (
      <OperationalView
        displayName={displayName}
        greeting={greeting}
        todayLabel={todayLabel}
        todayAppointments={todayAppointments}
        weekStats={weekStats}
        patientCount={patientCount}
      />
    )
  }

  return (
    <OnboardingView
      displayName={displayName}
      greeting={greeting}
      onboarding={onboarding}
      completedSteps={completedSteps}
      totalSteps={totalSteps}
      upcomingCount={upcomingCount}
      patientCount={patientCount}
    />
  )
}

function OnboardingView({
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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#6926D2]">
                    {done ? <CheckIcon className="h-5 w-5" strokeWidth={2.5} /> : step.icon}
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

function OperationalView({
  displayName,
  greeting,
  todayLabel,
  todayAppointments,
  weekStats,
  patientCount,
}: {
  displayName: string
  greeting: 'morning' | 'afternoon' | 'night'
  todayLabel: string
  todayAppointments: TodayAppointment[]
  weekStats: WeekStats
  patientCount: number
}) {
  const enCursoCount = todayAppointments.filter((a) => a.statut === 'en_curso').length
  const pendientesWeek = Math.max(
    weekStats.appointments - Math.round((weekStats.confirmedPct / 100) * weekStats.appointments),
    0
  )

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6926D2] to-[#3c008a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-300/25 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-pulse" />
              <span>{todayLabel}</span> · {todayAppointments.length} citas hoy
            </div>
            <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">
              {GREETING_TEXT[greeting]}, {displayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Tu clínica está lista. Gestiona tus citas, pacientes e ingresos desde aquí.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              href="/dashboard/appointments"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#6926D2] transition-colors hover:bg-gray-100"
            >
              + Nueva cita
            </Link>
            <Link
              href="/dashboard/appointments"
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Ver agenda
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Citas de hoy */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Citas de hoy</h2>
              <p className="text-sm text-gray-500">
                {todayLabel} · {todayAppointments.length} programadas
              </p>
            </div>
            {enCursoCount > 0 && (
              <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-[#6926D2]">
                {enCursoCount} en curso
              </span>
            )}
          </div>

          {todayAppointments.length === 0 ? (
            <div className="mb-3 space-y-3">
              <p className="text-sm text-gray-400">No tienes citas programadas para hoy</p>
              <Link
                href="/dashboard/appointments"
                className="inline-flex items-center gap-1 rounded-xl bg-[#6926D2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5a20b8]"
              >
                + Nueva cita
              </Link>
            </div>
          ) : (
            <div className="mb-3 space-y-2">
              {todayAppointments.map((appt) => {
                const config = STATUT_CONFIG[appt.statut] ?? STATUT_CONFIG.pendiente
                return (
                  <div
                    key={appt.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50"
                  >
                    <span className="w-12 shrink-0 text-sm font-semibold text-[#6926D2]">
                      {formatHora(appt.horaCita)}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-[#6926D2]">
                      {initials(appt.patientName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{appt.patientName}</p>
                      <p className="text-xs text-gray-500">Consulta médica</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${config.badgeBg} ${config.badgeText}`}
                    >
                      {config.label}
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  </div>
                )
              })}
            </div>
          )}

          <div className="group flex items-center justify-between rounded-xl border border-dashed border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3 text-gray-400">
              <span className="w-10 text-sm font-medium">--:--</span>
              <span className="text-sm">Slot disponible</span>
            </div>
            <Link
              href="/dashboard/appointments"
              className="flex items-center gap-1 text-sm font-medium text-[#6926D2] group-hover:underline"
            >
              <span>+ Asignar turno</span>
            </Link>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Esta semana</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Citas</p>
                <p className="text-2xl font-semibold text-gray-900">{weekStats.appointments}</p>
                {weekStats.deltaVsLastWeek > 0 && (
                  <p className="text-xs font-medium text-[#059669]">↑ +{weekStats.deltaVsLastWeek} vs sem. ant.</p>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Pacientes</p>
                <p className="text-2xl font-semibold text-gray-900">{patientCount}</p>
                <p className="text-xs text-gray-400">total registrados</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Confirmadas</p>
                <p className="text-2xl font-semibold text-gray-900">{weekStats.confirmedPct}%</p>
                <p className="text-xs text-gray-400">{pendientesWeek} pendientes</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 opacity-50">
                <p className="text-xs text-gray-500">Ingresos oct.</p>
                <p className="text-2xl font-semibold text-gray-900">—</p>
                <p className="text-xs text-gray-400">próximamente</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Acciones rápidas</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/appointments"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-all hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-[#6926D2]">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Nueva cita</p>
                  <p className="text-xs text-gray-500">Agendar en el calendario</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
              <Link
                href="/dashboard/patients"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-all hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-[#059669]">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Nuevo paciente</p>
                  <p className="text-xs text-gray-500">Registrar ficha clínica</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
              <Link
                href="/dashboard/ingresos"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-all hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#D97706]">
                  <CashIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Ver ingresos</p>
                  <p className="text-xs text-gray-500">Resumen del mes</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
