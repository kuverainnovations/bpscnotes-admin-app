'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  Users, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, Smartphone, Calendar, Clock, User, Copy,
} from 'lucide-react'

const LIMIT = 20

interface AccountInfo {
  id: string
  name: string
  mobile: string
  email: string
  status: string
  created_at: string
  last_active_at: string | null
}

interface DeviceGroup {
  device_id: string
  account_count: number
  accounts: AccountInfo[]
  last_registered: string
  first_registered: string
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-400">—</span>
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return <span className="text-green-600 font-medium">Today</span>
  if (d === 1) return <span className="text-green-600 font-medium">Yesterday</span>
  return <span className="text-gray-600">{d}d ago</span>
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
    status === 'banned'  ? 'bg-red-100 text-red-700 border-red-200' :
                           'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {status}
    </span>
  )
}

function DeviceGroupRow({ group }: { group: DeviceGroup }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-amber-200 rounded-xl bg-amber-50/40 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-amber-50 transition-colors text-left"
      >
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
          <Smartphone size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-700 truncate">{group.device_id}</span>
            <button
              onClick={e => { e.stopPropagation(); copyText(group.device_id) }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <Copy size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> First: {new Date(group.first_registered).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Clock size={11} /> Last: {new Date(group.last_registered).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
            {group.account_count} accounts
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {group.accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 px-5 py-3 bg-white/60">
              <div className="p-1.5 rounded-full bg-gray-100 text-gray-500">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{acc.name || '—'}</span>
                  <StatusPill status={acc.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span>{acc.mobile}</span>
                  {acc.email && <span>{acc.email}</span>}
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 flex-shrink-0">
                <div>Registered <RelativeTime iso={acc.created_at} /></div>
                <div>Active <RelativeTime iso={acc.last_active_at} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SuspiciousAccountsPage() {
  const [groups, setGroups] = useState<DeviceGroup[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/users/suspicious', { params: { page: p, limit: LIMIT } })
      setGroups(res.data?.data?.groups || [])
      setTotal(res.data?.data?.total || 0)
    } catch {
      showToast('Failed to load suspicious accounts', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load(page) }, [page, load])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Suspicious Accounts" subtitle="Device IDs shared by multiple accounts" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Summary bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">{total} device group{total !== 1 ? 's' : ''} with multiple accounts</span>
          </div>
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Groups list */}
        {loading && groups.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No suspicious device groups found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => <DeviceGroupRow key={g.device_id} group={g} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} groups
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
