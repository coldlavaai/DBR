'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dbr-analytics'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setAuthError('Invalid email or password')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setAuthError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true)
    setAuthError(null)

    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      setAuthError('Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  const getErrorMessage = (error: string | null) => {
    if (!error) return null

    const errorMessages: Record<string, string> = {
      'OAuthAccountNotLinked': 'This email is already registered with a different login method.',
      'CredentialsSignin': 'Invalid email or password.',
      'Default': 'An error occurred during sign in.',
    }

    return errorMessages[error] || errorMessages['Default']
  }

  return (
    <div className="min-h-screen bg-gradient-coldlava flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-coldlava-cyan opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-coldlava-pink opacity-10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-coldlava-yellow opacity-10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 animate-slide-up">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            {/* Cold Lava Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/logos/cold-lava-logo.png"
                alt="Cold Lava AI"
                width={200}
                height={60}
                className="drop-shadow-2xl"
                priority
              />
            </div>

            {/* DBR + Greenstar */}
            <div className="flex items-center justify-center gap-4 mb-4 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 inline-flex">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-coldlava-cyan to-coldlava-purple bg-clip-text text-transparent">
                DBR
              </h1>
              <Image
                src="/greenstar-logo.png"
                alt="Greenstar Solar"
                width={120}
                height={40}
                className="drop-shadow-lg"
              />
            </div>

            <p className="text-gray-300 mt-4">Sign in to continue</p>
          </div>

          {/* Error Message */}
          {(error || authError) && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">
                {authError || getErrorMessage(error)}
              </p>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-400/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-gray-300 bg-transparent">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan focus:border-transparent transition-all"
                  placeholder="oliver@coldlava.ai"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-cyan text-white rounded-lg font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>Powered by <span className="text-coldlava-cyan font-semibold">Cold Lava</span></p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-300">
          <p>Need access? Contact <a href="mailto:oliver@coldlava.ai" className="text-coldlava-cyan hover:underline">oliver@coldlava.ai</a></p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-coldlava flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
