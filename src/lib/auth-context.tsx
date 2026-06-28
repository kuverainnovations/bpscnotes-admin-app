'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api, { clearToken } from '@/lib/api'

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
  refreshAdmin:  (updates: Partial<AdminUser>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin]     = useState<AdminUser | null>(null)
  const [isLoading, setLoading] = useState(true)
  const router = useRouter()

  // Restore session from localStorage on mount.
  // The adminToken is an httpOnly cookie (JS-inaccessible); we keep adminUser
  // in localStorage as a non-sensitive indicator that a session exists.
  // A 401 from any API call will clear adminUser and redirect to login.
  useEffect(() => {
    const stored = localStorage.getItem('adminUser')
    if (stored) {
      try {
        setAdmin(JSON.parse(stored))
      } catch {
        clearToken()
        setAdmin(null)
      }
    } else {
      setAdmin(null)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    const adminData = res.data?.admin
    if (!adminData) {
      throw new Error('Login failed')
    }
    localStorage.setItem('adminUser', JSON.stringify(adminData))
    setAdmin(adminData)
    router.push('/dashboard')
  }

  const refreshAdmin = (updates: Partial<AdminUser>) => {
    setAdmin(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('adminUser', JSON.stringify(updated))
      return updated
    })
  }

  const logout = () => {
    api.auth.logout().catch(() => {})
    clearToken()
    setAdmin(null)
    router.push('/')
  }

  const hasPermission = (perm: string) => {
    if (!admin) return false
    return admin.permissions.includes('all') || admin.permissions.includes(perm)
  }

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout, hasPermission, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}