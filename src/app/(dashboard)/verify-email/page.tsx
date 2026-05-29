'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { CheckCircle2, XCircle, Loader2, Shield, ArrowRight } from 'lucide-react'

// ── Inner component (needs useSearchParams inside Suspense) ──
function VerifyEmailContent() {
  const params  = useSearchParams()
  const router  = useRouter()
  const token   = params.get('token') ?? ''

  type State = 'loading' | 'success' | 'expired' | 'invalid' | 'already_verified'
  const [state, setState] = useState<State>('loading')
  const [adminName, setAdminName] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!token) { setState('invalid'); return }

    api.adminUsers.verifyToken(token)
      .then((res: any) => {
        setAdminName(res?.data?.name ?? 'Admin')
        setState(res?.data?.alreadyVerified ? 'already_verified' : 'success')
      })
      .catch((err: any) => {
        const msg = (err.message ?? '').toLowerCase()
        if (msg.includes('expired'))          setState('expired')
        else if (msg.includes('already'))     setState('already_verified')
        else                                   setState('invalid')
      })
  }, [token])

  // Auto-redirect to login after success
  useEffect(() => {
    if (state !== 'success') return
    const id = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(id); router.push('/login'); return 0 }
        return n - 1
      })
    }, 1_000)
    return () => clearInterval(id)
  }, [state, router])

  // ── Loading ────────────────────────────────────────────
  if (state === 'loading') return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
        <Loader2 size={28} className="text-brand-600 animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Verifying your email…</h2>
      <p className="text-sm text-slate-500">Please wait a moment</p>
    </div>
  )

  // ── Success ────────────────────────────────────────────
  if (state === 'success' || state === 'already_verified') return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center relative">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
          {state === 'already_verified' ? 'Already Verified' : `Welcome, ${adminName}! 🎉`}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {state === 'already_verified'
            ? 'Your email was already verified. You can log in anytime.'
            : 'Your email has been verified. Your admin account is now active.'}
        </p>
      </div>

      {state === 'success' && (
        <div className="w-full p-4 bg-green-50 rounded-2xl border border-green-200 space-y-2">
          {[
            '✅ Email verified successfully',
            '🔓 Admin account is now active',
            '🚀 You can now log in with your credentials',
          ].map(t => (
            <p key={t} className="text-xs text-green-800 font-medium">{t}</p>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push('/login')}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
      >
        Go to Login <ArrowRight size={16} />
      </button>

      {state === 'success' && (
        <p className="text-xs text-slate-400">Redirecting to login in {countdown}s…</p>
      )}
    </div>
  )

  // ── Expired ────────────────────────────────────────────
  if (state === 'expired') return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
        <XCircle size={40} className="text-amber-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
          Link Expired
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          This verification link has expired. Verification links are valid for 24 hours.
        </p>
      </div>
      <div className="w-full p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5">
        <p className="text-sm font-semibold text-amber-900">What to do next:</p>
        <p className="text-xs text-amber-800">1. Ask your main admin to resend the verification email</p>
        <p className="text-xs text-amber-800">2. Click the new link within 24 hours</p>
        <p className="text-xs text-amber-800">3. Or ask them to manually approve your account</p>
      </div>
      <p className="text-xs text-slate-400">
        Contact your main administrator to resend the verification link.
      </p>
    </div>
  )

  // ── Invalid ────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle size={40} className="text-red-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
          Invalid Link
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          This verification link is invalid or has already been used.
        </p>
      </div>
      <p className="text-xs text-slate-400">
        If you believe this is an error, contact your main administrator.
      </p>
    </div>
  )
}

// ── Page wrapper ───────────────────────────────────────────
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo / brand bar */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg leading-none" style={{ fontFamily: 'DM Serif Display,serif' }}>BPSCNotes</p>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 size={28} className="text-brand-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading…</p>
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} BPSCNotes Admin · Secure access
        </p>
      </div>
    </div>
  )
}
