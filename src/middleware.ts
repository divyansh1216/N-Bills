import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
// Only these static PWA resources bypass session handling.
const PWA_PUBLIC_PATHS = new Set([
  '/manifest.webmanifest', '/manifest.json', '/sw.js',
  '/notification-sw.js', '/offline.html', '/.well-known/assetlinks.json',
])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PWA_PUBLIC_PATHS.has(pathname)) return NextResponse.next()
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Firebase Auth is client-side only; we use a session cookie set by the app
  const session = request.cookies.get('nb-session')?.value

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
