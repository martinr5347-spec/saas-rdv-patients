export function toTenantParts(iso: string, timeZone: string) {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

export function toTenantDate(iso: string, timeZone: string) {
  const p = toTenantParts(iso, timeZone)
  return `${p.year}-${p.month}-${p.day}`
}

export function toTenantTime(iso: string, timeZone: string) {
  const p = toTenantParts(iso, timeZone)
  return `${p.hour}:${p.minute}:${p.second}`
}

export function tenantDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  // On cherche le timestamp UTC qui correspond à la wall-clock date/time dans timeZone
  let candidate = new Date(`${date}T${time}Z`)

  for (let i = 0; i < 3; i++) {
    const p = toTenantParts(candidate.toISOString(), timeZone)
    const candidateLocal = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
    const target = `${date}T${time}`
    if (candidateLocal === target) break

    const candidateMs = candidate.getTime()
    const targetMs = Date.parse(target)
    const targetMsLocal = Date.parse(candidateLocal)
    if (Number.isNaN(targetMs) || Number.isNaN(targetMsLocal)) break

    candidate = new Date(candidateMs + (targetMs - targetMsLocal))
  }

  return candidate
}

export function isTenantDeadlinePassed(
  startIso: string,
  hoursToAdd: number,
  timeZone: string,
  now = new Date()
): boolean {
  const start = new Date(startIso).getTime()
  const deadlineMs = start + hoursToAdd * 60 * 60 * 1000
  const nowMs = now.getTime()
  return deadlineMs <= nowMs
}

export function isTenantAppointmentReminderDue(
  date: string,
  time: string,
  hoursBefore: number,
  timeZone: string,
  now = new Date()
): boolean {
  const appointmentUtc = tenantDateTimeToUtc(date, time, timeZone)
  const reminderUtc = new Date(appointmentUtc.getTime() - hoursBefore * 60 * 60 * 1000)
  return reminderUtc <= now
}
