'use client'

import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es, ptBR } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import styles from './calendar-theme.module.css'

export interface PaidAppointment {
  id: string
  fecha_cita: string
  hora_cita: string
  hora_fin: string | null
  patients: { nom: string } | null
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
}

const LOCALES = { es, pt: ptBR }

function EventBlock({ event, paidLabel }: { event: CalendarEvent; paidLabel: string }) {
  return (
    <div className="flex items-center gap-1.5 overflow-hidden text-xs text-white">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
      <span className="truncate font-medium">{event.title}</span>
      <span className="shrink-0 opacity-80">{format(event.start, 'HH:mm')}</span>
      <span className="hidden shrink-0 opacity-80 sm:inline">· {paidLabel}</span>
    </div>
  )
}

export default function AppointmentsCalendarView({ appointments }: { appointments: PaidAppointment[] }) {
  const locale = (useLocale() as 'es' | 'pt') ?? 'es'
  const t = useTranslations('dashboard.appointments.calendar')
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.WEEK)

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales: LOCALES,
      }),
    []
  )

  const events = useMemo<CalendarEvent[]>(
    () =>
      appointments.map((a) => {
        const start = new Date(`${a.fecha_cita}T${a.hora_cita}`)
        // hora_fin vient directement du end_time du webhook Calendly (duree reelle
        // du type de consultation configure dans Calendly). Repli de 30 min pour les
        // RDV crees avant l'ajout de ce champ, ou si Calendly ne l'a pas fourni.
        const end = a.hora_fin ? new Date(`${a.fecha_cita}T${a.hora_fin}`) : new Date(start.getTime() + 30 * 60 * 1000)
        return {
          id: a.id,
          title: a.patients?.nom ?? '-',
          start,
          end,
        }
      }),
    [appointments]
  )

  const messages = {
    today: t('today'),
    previous: t('previous'),
    next: t('next'),
    month: t('month'),
    week: t('week'),
    day: t('day'),
    noEventsInRange: t('noEvents'),
  }

  return (
    <div className={styles.wrapper} style={{ height: 650 }}>
      <Calendar
        localizer={localizer}
        events={events}
        culture={locale === 'pt' ? 'pt' : 'es'}
        date={date}
        view={view}
        onNavigate={setDate}
        onView={setView}
        views={[Views.MONTH, Views.WEEK, Views.DAY] as View[]}
        messages={messages}
        components={{
          event: (props) => <EventBlock event={props.event as CalendarEvent} paidLabel={t('paidLabel')} />,
        }}
      />
    </div>
  )
}
