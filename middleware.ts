import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/error', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If trying to access protected route while not logged in
  if (!isPublicRoute && !isLoggedIn) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (pathname === '/auth/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dbr-analytics', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
