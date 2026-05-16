'use client'
import { Loader2, RefreshCw, AlertCircle, PackageOpen } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-brand-500" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-8 text-center max-w-md w-full">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="font-semibold text-slate-800 mb-2">Failed to load data</p>
        <p className="text-sm text-red-500 mb-4">{message}</p>
        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-left">
          <p className="text-xs text-slate-500 font-medium mb-1">Backend URL:</p>
          <code className="text-xs text-slate-700">{process.env.NEXT_PUBLIC_API_URL}</code>
        </div>
        <p className="text-xs text-slate-400 mb-4">Make sure bpscnotes-backend is running</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary justify-center w-full">
            <RefreshCw size={14} />Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, subtitle, icon = '📭' }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl">{icon}</span>
      <p className="font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 text-center max-w-xs">{subtitle}</p>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-700 border-green-200',
    published: 'bg-green-100 text-green-700 border-green-200',
    success:   'bg-green-100 text-green-700 border-green-200',
    inactive:  'bg-slate-100 text-slate-500 border-slate-200',
    draft:     'bg-yellow-100 text-yellow-700 border-yellow-200',
    pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    sent:      'bg-blue-100 text-blue-700 border-blue-200',
    expired:   'bg-red-100 text-red-600 border-red-200',
    banned:    'bg-red-100 text-red-600 border-red-200',
    rejected:  'bg-red-100 text-red-600 border-red-200',
    failed:    'bg-red-100 text-red-600 border-red-200',
    review:    'bg-orange-100 text-orange-700 border-orange-200',
    upcoming:  'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-teal-100 text-teal-700 border-teal-200',
  }
  const cls = map[status?.toLowerCase()] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return <span className={`badge ${cls}`}>{status}</span>
}

export function Pagination({
  page, totalPages, onPage
}: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium disabled:opacity-40 transition-colors">
          ← Prev
        </button>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium disabled:opacity-40 transition-colors">
          Next →
        </button>
      </div>
    </div>
  )
}

export function ActionButtons({
  onEdit, onDelete, onView, onApprove, onReject
}: {
  onEdit?:    () => void
  onDelete?:  () => void
  onView?:    () => void
  onApprove?: () => void
  onReject?:  () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {onView    && <button onClick={onView}    className="w-7 h-7 rounded-lg bg-blue-50   hover:bg-blue-100   flex items-center justify-center transition-colors" title="View">👁</button>}
      {onApprove && <button onClick={onApprove} className="w-7 h-7 rounded-lg bg-green-50  hover:bg-green-100  flex items-center justify-center transition-colors text-xs font-bold text-green-600" title="Approve">✓</button>}
      {onEdit    && <button onClick={onEdit}    className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors" title="Edit">✏️</button>}
      {onReject  && <button onClick={onReject}  className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center transition-colors text-xs font-bold text-orange-600" title="Reject">✗</button>}
      {onDelete  && <button onClick={onDelete}  className="w-7 h-7 rounded-lg bg-red-50    hover:bg-red-100    flex items-center justify-center transition-colors" title="Delete">🗑</button>}
    </div>
  )
}

export function ConfirmModal({
  open, title, message, onConfirm, onCancel, danger = true
}: {
  open:      boolean
  title:     string
  message:   string
  onConfirm: () => void
  onCancel:  () => void
  danger?:   boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-up p-6" onClick={e => e.stopPropagation()}>
        <p className="font-bold text-slate-900 text-lg mb-2">{title}</p>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}  className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 justify-center py-2 px-4 rounded-xl text-sm font-semibold text-white transition-all ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
