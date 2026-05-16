'use client'
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api, { getToken, clearToken } from '@/lib/api'

// ════════════════════════════════════════════════════════════
// Auth Context — Production
//
// BUG 7 FIX: REMOVED FALSE-POSITIVE TOKEN VALIDATION
//
// The previous version called api.dashboard.getStats() on every
// page mount to "validate" the token:
//
//   useEffect(() => {
//     if (admin && getToken()) {
//       api.dashboard.getStats().catch(() => {
//         clearToken()        ← clears VALID token on any transient failure
//         setAdmin(null)
//         router.replace('/')  ← random logout
//       })
//     }
//   }, [])
//
// WHY THIS CAUSES RANDOM LOGOUTS:
//   1. Admin navigates to /quizzes
//   2. Dashboard stats API is slow (DB query, Redis miss, VPS load spike)
//   3. getStats() times out or gets 503 (transient)
//   4. catch() fires → clearToken() → redirect to login
//   5. User sees "Failed to fetch" and gets kicked out
//   6. Their token was VALID — the stats endpoint just had a blip
//
// FIX: Do NOT call any API to validate the token on mount.
//   If the token is expired, the FIRST real API call the page makes
//   will get 401, which api.ts handles by clearing the token and
//   redirecting to login. That is the correct, non-racy flow.
//
// BUG (kept correct): synchronous lazy initializer — no async gap on refresh.
//   useState(readStoredAdmin) runs synchronously → admin is available
//   immediately on first render → no isLoading race condition.
// ════════════════════════════════════════════════════════════

interface AdminUser {
  id:          string
  name:        string
  email:       string
  permissions: string[]
}

interface AuthContextType {
  admin:         AdminUser | null
  isLoading:     boolean   // kept for API compat but always false now
  login:         (email: string, password: string) => Promise<void>
  logout:        () => void
  hasPermission: (perm: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Synchronous read — safe on server (window undefined → null)
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
  // Synchronous lazy init — admin is available on first render, no async gap
  const [admin, setAdmin] = useState<AdminUser | null>(readStoredAdmin)
  const router = useRouter()

  // FIX BUG 7: NO background api call here.
  // Token expiry is handled by api.ts: 401 → clearToken() → redirect to /
  // We do NOT call any API here. That was causing random logouts.

  const login = async (email: string, password: string) => {
    const res       = await api.auth.login(email, password)
    const token     = res.data?.token
    const adminData = res.data?.admin

    if (!token) throw new Error('Login failed — no token received from server')

    // api.auth.login already called setToken(token) inside api.ts
    try {
      localStorage.setItem('adminUser', JSON.stringify(adminData))
    } catch {}
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
    const perms = admin.permissions || []
    return perms.includes('all') || perms.includes(perm)
  }

  return (
    <AuthContext.Provider value={{
      admin,
      isLoading: false,  // always false — no async init
      login,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
