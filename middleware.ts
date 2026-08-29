import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.organization_id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('statut, trial_ends_at')
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    const isTrialExpired =
      subscription?.statut === 'trial' &&
      (!subscription.trial_ends_at || new Date(subscription.trial_ends_at) < new Date())

    const isAllowed = subscription?.statut === 'active' || (subscription?.statut === 'trial' && !isTrialExpired)

    if (!isAllowed) {
      const url = new URL('/subscribe', request.url)
      if (isTrialExpired) url.searchParams.set('expired', '1')
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
