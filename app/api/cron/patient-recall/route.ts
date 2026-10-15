import { NextResponse } from 'next/server'
import { handlePatientRecalls } from '@/lib/cron/patient-recall'

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
    await handlePatientRecalls()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('patient-recall cron error:', e)
    return NextResponse.json({ ok: true })
  }
}
