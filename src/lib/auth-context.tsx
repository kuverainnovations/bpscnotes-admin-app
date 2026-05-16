'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api, { getToken, clearToken, setToken } from '@/lib/api'

// ════════════════════════════════════════════════════════════
// Auth Context — Production-grade session handling
//
// ROOT CAUSE FIXES:
//
// BUG 7 — ASYNC USEEFFECT CAUSES REFRESH RACE CONDITION (CRITICAL)
//   BEFORE: useState(true) for isLoading → async useEffect reads localStorage
//   On page refresh the sequence is:
//     Frame 1: React renders → isLoading=true → dashboard sees isLoading=true → waits
//     Frame 2: useEffect fires → reads localStorage → setAdmin() → setLoading(false)
//     Frame 3: Dashboard useEffect sees admin != null → calls load()
//   The gap between Frame 1-3 is non-deterministic. If the component unmounts
//   before Frame 3 (e.g. strict mode double-invoke) the load() never fires.
//
//   FIX: Use synchronous lazy initializer in useState() — reads localStorage
//   synchronously on first render, eliminating the async gap entirely.
//   isLoading starts false because there's nothing async happening.
//
// BUG 8 — NO SERVER-SIDE TOKEN VALIDATION ON REFRESH
//   Restored session from localStorage only checks if strings exist.
//   A stored expired token will appear valid until the first API call fails.
//   FIX: After restoring from localStorage, silently verify token is still valid
//   by calling /admin/stats (a fast endpoint). If 401 → clear and redirect.
//
// BUG 9 — DEBUG LOGS LEAKING JWT TOKEN
//   console.log('LOGIN RESPONSE 👉', res) prints full JWT to browser console
//   console.log("ERROR 👉", err) in login error handler
//   FIX: Removed both.
// ════════════════════════════════════════════════════════════

interface AdminUser {
  id:          string
  name:        string
  email:       string
  permissions: string[]
}

interface AuthContextType {
  admin:         AdminUser | null
  isLoading:     boolean
  login:         (email: string, password: string) => Promise<void>
  logout:        () => void
  hasPermission: (perm: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Sync read from localStorage (safe on server = returns null) ──
function readStoredAdmin(): AdminUser | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('adminUser')
    const token  = getToken()
    if (!stored || !token) return null
    return JSON.parse(stored) as AdminUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // CRITICAL FIX: synchronous lazy initializer — no async gap on refresh
  const [admin, setAdmin]     = useState<AdminUser | null>(readStoredAdmin)
  const [isLoading, setLoading] = useState(false)  // no async init needed
  const router = useRouter()

  // Optional: silently revalidate token after hydration
  // If the stored token is expired, the next API call will 401 and redirect.
  // This useEffect is intentionally minimal — it does NOT block UI rendering.
  useEffect(() => {
    // If we have a stored admin, verify the token is still valid in background.
    // This catches expired tokens without blocking the page render.
    if (admin && getToken()) {
      api.dashboard.getStats().catch(() => {
        // Token invalid — clear session and redirect to login
        clearToken()
        setAdmin(null)
        router.replace('/')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  const login = async (email: string, password: string) => {
    const res       = await api.auth.login(email, password)
    const token     = res.data?.token
    const adminData = res.data?.admin

    if (!token) throw new Error('Login failed — no token received')

    // api.auth.login already calls setToken(token) inside api.ts
    // so we just need to store the user object
    localStorage.setItem('adminUser', JSON.stringify(adminData))
    setAdmin(adminData)
    router.push('/dashboard')
  }

  const logout = () => {
    clearToken()
    setAdmin(null)
    router.push('/')
  }

  const hasPermission = (perm: string): boolean => {
    if (!admin) return false
    return admin.permissions.includes('all') || admin.permissions.includes(perm)
  }

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
