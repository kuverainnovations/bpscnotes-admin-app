'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Eye, EyeOff, BookOpen, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login, admin, isLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // If already authenticated, skip the login form
  useEffect(() => {
    if (!isLoading && admin) {
      router.replace('/dashboard')
    }
  }, [isLoading, admin, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true); setError('')
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again123.')
    } finally { setLoading(false) }
  }

  if (isLoading || admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 shadow-lg mb-4">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
            BPSCNotes Admin
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your platform</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="admin@bpscnotes.com" disabled={loading} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" placeholder="Enter your password" disabled={loading} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">BPSCNotes Admin Panel · Secured</p>
      </div>
    </div>
  )
}