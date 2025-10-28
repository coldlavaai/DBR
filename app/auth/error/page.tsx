'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    const errorMessages: Record<string, { title: string; description: string }> = {
      'Configuration': {
        title: 'Server Configuration Error',
        description: 'There is a problem with the server configuration. Please contact support.',
      },
      'AccessDenied': {
        title: 'Access Denied',
        description: 'You do not have permission to sign in. Please contact an administrator.',
      },
      'Verification': {
        title: 'Verification Failed',
        description: 'The verification link may have expired or already been used.',
      },
      'OAuthAccountNotLinked': {
        title: 'Account Linking Error',
        description: 'This email is already registered with a different sign-in method. Please use your original sign-in method.',
      },
      'Default': {
        title: 'Authentication Error',
        description: 'An error occurred during authentication. Please try again.',
      },
    }

    return errorMessages[error || 'Default'] || errorMessages['Default']
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen bg-gradient-coldlava flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-coldlava-cyan opacity-10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-coldlava-pink opacity-10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 animate-slide-up">
          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-xl mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{errorInfo.title}</h1>
            <p className="text-gray-300">{errorInfo.description}</p>
          </div>

          {/* Error Details */}
          {error && (
            <div className="mb-6 p-4 bg-black/20 rounded-lg">
              <p className="text-sm text-gray-400">Error code: <span className="text-gray-200 font-mono">{error}</span></p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-cyan text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>

            <Link
              href="mailto:oliver@otdm.net"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all"
            >
              Contact Support
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>Powered by <span className="text-coldlava-cyan font-semibold">Cold Lava</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
