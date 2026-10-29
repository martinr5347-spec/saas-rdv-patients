'use client'

import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es, ptBR, fr } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
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

const LOCALES = { es, pt: ptBR, fr }

// Duree minimale imposee cote client lors du redimensionnement, pour eviter un creneau de
// quelques secondes avant meme la validation serveur (qui exige hora_fin > hora_cita).
const DUREE_MIN_MINUTOS = 5
// Arrondi de la poignee de redimensionnement, en minutes.
const PAS_ARRONDI_MINUTOS = 5

// react-big-calendar n'expose pas de mode "resize seul, sans deplacement" via son addon
// drag-and-drop officiel : EventWrapper.js (v1.20.0) renvoie l'evenement sans aucun wrapper
// (donc sans les poignees de resize) des que draggableAccessor renvoie false, meme si
// resizableAccessor renvoie true -- verifie en conditions reelles, pas seulement sur les types.
// Plutot que d'activer le deplacement complet (non demande), on implemente ici une poignee de
// redimensionnement maison, independante de l'addon.
function PoigneeRedimension({
  eventStart,
  eventEnd,
  onPreview,
  onCommit,
}: {
  eventStart: Date
  eventEnd: Date
  onPreview: (nuevoFin: Date) => void
  onCommit: (nuevoFin: Date) => void
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const startY = e.clientY
    const duracionMsInicial = eventEnd.getTime() - eventStart.getTime()

    const timeslotGroup = document.querySelector('.rbc-time-content .rbc-timeslot-group')
    const pxPorHora = timeslotGroup ? timeslotGroup.getBoundingClientRect().height : 48
    const pxPorMinuto = pxPorHora / 60

    const calcularNuevoFin = (clientY: number): Date => {
      const deltaMinutosBruto = (clientY - startY) / pxPorMinuto
      const deltaMinutos = Math.round(deltaMinutosBruto / PAS_ARRONDI_MINUTOS) * PAS_ARRONDI_MINUTOS
      const duracionMs = Math.max(DUREE_MIN_MINUTOS * 60000, duracionMsInicial + deltaMinutos * 60000)
      return new Date(eventStart.getTime() + duracionMs)
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onPreview(calcularNuevoFin(moveEvent.clientY))
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      onCommit(calcularNuevoFin(upEvent.clientY))
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group/resize absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
      title="Arrastra para cambiar la duración"
    >
      <div className="mx-auto mt-1.5 h-0.5 w-6 rounded-full bg-white/60 opacity-0 transition-opacity group-hover/resize:opacity-100" />
    </div>
  )
}

function EventBlock({
  event,
  paidLabel,
  view,
  onPreview,
  onCommit,
}: {
  event: CalendarEvent
  paidLabel: string
  view: View
  onPreview: (eventId: string, nuevoFin: Date) => void
  onCommit: (eventId: string, nuevoFin: Date) => void
}) {
  return (
    <div className="relative flex h-full items-center gap-1.5 overflow-hidden text-xs text-white">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
      <span className="truncate font-medium">{event.title}</span>
      <span className="shrink-0 opacity-80">{format(event.start, 'HH:mm')}</span>
      <span className="hidden shrink-0 opacity-80 sm:inline">· {paidLabel}</span>
      {/* La vue mois n'a pas d'axe temporel -- le redimensionnement par glisser n'a de sens qu'en vue jour/semaine. */}
      {view !== Views.MONTH && (
        <PoigneeRedimension
          eventStart={event.start}
          eventEnd={event.end}
          onPreview={(nuevoFin) => onPreview(event.id, nuevoFin)}
          onCommit={(nuevoFin) => onCommit(event.id, nuevoFin)}
        />
      )}
    </div>
  )
}

export default function AppointmentsCalendarView({ appointments }: { appointments: PaidAppointment[] }) {
  const locale = (useLocale() as 'es' | 'pt' | 'fr') ?? 'es'
  const t = useTranslations('dashboard.appointments.calendar')
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.WEEK)
  // Surcharge locale de hora_fin par id de RDV -- apercu live pendant le glisser + update optimiste
  // apres confirmation, la prop `appointments` elle-meme ne change qu'au prochain rendu serveur.
  const [horaFinOverrides, setHoraFinOverrides] = useState<Record<string, string>>({})

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
        const horaFinEfectiva = horaFinOverrides[a.id] ?? a.hora_fin
        // hora_fin vient directement du end_time du webhook Calendly (duree reelle
        // du type de consultation configure dans Calendly). Repli de 30 min pour les
        // RDV crees avant l'ajout de ce champ, ou si Calendly ne l'a pas fourni.
        const end = horaFinEfectiva ? new Date(`${a.fecha_cita}T${horaFinEfectiva}`) : new Date(start.getTime() + 30 * 60 * 1000)
        return {
          id: a.id,
          title: a.patients?.nom ?? '-',
          start,
          end,
        }
      }),
    [appointments, horaFinOverrides]
  )

  const handlePreview = (eventId: string, nuevoFin: Date) => {
    setHoraFinOverrides((prev) => ({ ...prev, [eventId]: format(nuevoFin, 'HH:mm') }))
  }

  const handleCommit = async (eventId: string, nuevoFin: Date) => {
    const nuevaHoraFin = format(nuevoFin, 'HH:mm')
    const appointment = appointments.find((a) => a.id === eventId)
    const horaFinPersistida = appointment?.hora_fin?.slice(0, 5) ?? null

    if (nuevaHoraFin === horaFinPersistida) return

    setHoraFinOverrides((prev) => ({ ...prev, [eventId]: nuevaHoraFin }))

    const res = await fetch(`/api/appointments/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hora_fin: nuevaHoraFin }),
    })

    if (!res.ok) {
      // Rollback de l'apercu optimiste vers la derniere valeur confirmee.
      setHoraFinOverrides((prev) => {
        const next = { ...prev }
        if (horaFinPersistida === null) delete next[eventId]
        else next[eventId] = horaFinPersistida
        return next
      })
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Error al actualizar la duración de la cita')
    } else {
      toast.success('Duración actualizada')
    }
  }

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
          event: (props) => (
            <EventBlock
              event={props.event as CalendarEvent}
              paidLabel={t('paidLabel')}
              view={view}
              onPreview={handlePreview}
              onCommit={handleCommit}
            />
          ),
        }}
      />
    </div>
  )
}
