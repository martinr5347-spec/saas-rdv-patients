import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Profil incomplet' }, { status: 400 })
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString()

  const { error } = await supabase
    .from('subscriptions')
    .update({ statut: 'trial', trial_ends_at: trialEndsAt })
    .eq('organization_id', profile.organization_id)

  if (error) {
    console.error('Erreur activation essai:', error)
    return NextResponse.json({ error: 'Erreur activation essai' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
