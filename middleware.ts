import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value

  const { pathname } = request.nextUrl

  const isApiAuthRoute = pathname.startsWith('/api/auth')

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // If user is trying to access login page but is already logged in, redirect to dashboard
  if (pathname.startsWith('/login') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is trying to access a protected route without a session, redirect to login
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
