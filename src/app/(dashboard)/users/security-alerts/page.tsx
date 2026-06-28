'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  Shield, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, User, BookOpen, Eye,
} from 'lucide-react'

const LIMIT = 20

interface SecurityAlert {
  id: string
  session_id: string
  user_id: string
  flag_type: string
  severity: string
  details: any
  created_at: string
  user_name: string
  user_mobile: string
}

interface FlaggedSession {
  id: string
  user_id: string
  quiz_id: string
  background_secs: number
  status: string
  started_at: string
  submitted_at: string | null
  user_name: string
  quiz_title: string
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-amber-100 text-amber-700 border-amber-200',
    low:      'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${map[severity] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {severity}
    </span>
  )
}

function FlagTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ')
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 capitalize">
      {label}
    </span>
  )
}

function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-400">—</span>
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return <span className="text-green-600 font-medium">Just now</span>
  if (h < 24) return <span className="text-amber-600">{h}h ago</span>
  return <span className="text-gray-500">{d}d ago</span>
}

function formatBgSecs(secs: number) {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [flaggedSessions, setFlaggedSessions] = useState<FlaggedSession[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [activeTab, setActiveTab] = useState<'alerts' | 'sessions'>('alerts')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const load = useCallback(async (p: number, sev: SeverityFilter) => {
    setLoading(true)
    try {
      const params: any = { page: p, limit: LIMIT }
      if (sev !== 'all') params.severity = sev
      const res = await api.users.securityAlerts(params)
      const d = res.data?.data || res.data || {}
      setAlerts(d.alerts || [])
      setFlaggedSessions(d.flaggedSessions || [])
      setTotal(d.total || 0)
    } catch {
      showToast('Failed to load security alerts', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load(page, severity) }, [page, severity, load])

  const severityOptions: SeverityFilter[] = ['all', 'critical', 'high', 'medium', 'low']

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Security Alerts" subtitle="Anti-cheat flags and suspicious quiz activity" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            {severityOptions.map(s => (
              <button
                key={s}
                onClick={() => { setSeverity(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  severity === s
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All severities' : s}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(page, severity)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'alerts' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle size={14} />
            Anti-cheat Flags
            {total > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-bold">
                {total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'sessions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye size={14} />
            Tab-switch Sessions
            {flaggedSessions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-bold">
                {flaggedSessions.length}
              </span>
            )}
          </button>
        </div>

        {loading && alerts.length === 0 && flaggedSessions.length === 0 ? (
          <div className="flex justify-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : (
          <>
            {/* Anti-cheat Flags tab */}
            {activeTab === 'alerts' && (
              alerts.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Shield size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No anti-cheat flags found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-50 text-red-500 flex-shrink-0">
                          <AlertTriangle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <SeverityBadge severity={alert.severity} />
                            <FlagTypeBadge type={alert.flag_type} />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User size={13} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{alert.user_name}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500 text-xs">{alert.user_mobile}</span>
                          </div>
                          {alert.details && (
                            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto">
                              {JSON.stringify(alert.details, null, 2)}
                            </pre>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                          <Clock size={11} />
                          <RelativeTime iso={alert.created_at} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tab-switch Sessions tab */}
            {activeTab === 'sessions' && (
              flaggedSessions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Eye size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No tab-switch activity detected</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Quiz</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Background</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Started</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {flaggedSessions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{s.user_name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <BookOpen size={13} className="text-gray-400" />
                              <span className="text-gray-700 truncate max-w-[200px]">{s.quiz_title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono font-semibold ${s.background_secs > 300 ? 'text-red-600' : 'text-amber-600'}`}>
                              {formatBgSecs(s.background_secs)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              s.status === 'submitted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            <RelativeTime iso={s.started_at} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}

        {/* Pagination (alerts tab only) */}
        {activeTab === 'alerts' && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} alerts
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
