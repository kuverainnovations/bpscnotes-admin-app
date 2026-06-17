'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api, { getToken, clearToken } from '@/lib/api'

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

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('adminUser')
    const token  = getToken()
    if (stored && token) {
      try {
        setAdmin(JSON.parse(stored))
      } catch {
        // Corrupted stored user — clear everything, force re-login
        clearToken()
        setAdmin(null)
      }
    } else {
      // Missing token or user — ensure fully logged out state
      clearToken()
      setAdmin(null)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
  
    console.log('LOGIN RESPONSE 👉', res)
  
    const token = res.data?.token   // ✅ FIX HERE
    const adminData = res.data?.admin
  
    if (!token) {
      throw new Error('Login failed — no token received')
    }
  
    // Save admin user data
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