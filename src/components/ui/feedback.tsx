'use client'

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${s} border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin`} />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <span className="text-4xl mb-3">⚠️</span>
      <p className="font-semibold text-slate-800 mb-1">Something went wrong</p>
      <p className="text-sm text-slate-500 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, subtitle }: {
  icon?: string; title: string; subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="font-semibold text-slate-800 mb-1">{title}</p>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

export function Toast({
  message, type = 'success', onClose
}: {
  message: string; type?: 'success' | 'error'; onClose: () => void
}) {
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white text-sm font-medium animate-slide-up ${type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

// useToast hook
import { useState, useCallback } from 'react'
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const ToastComponent = toast
    ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
    : null

  return { showToast, ToastComponent }
}
