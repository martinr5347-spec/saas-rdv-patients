import { NextResponse } from 'next/server'
import { handlePaymentDeadlines } from '@/lib/cron/payment-deadline'

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
    await handlePaymentDeadlines()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('payment-deadline cron error:', e)
    return NextResponse.json({ ok: true })
  }
}
