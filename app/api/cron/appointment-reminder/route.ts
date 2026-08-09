import { NextResponse } from 'next/server'
import { handleAppointmentReminders } from '@/lib/cron/appointment-reminder'

function isAuthorized(req: Request) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '') ?? new URL(req.url).searchParams.get('secret')
  return token === process.env.CRON_SECRET
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await handleAppointmentReminders()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('appointment-reminder cron error:', e)
    return NextResponse.json({ ok: true })
  }
}
