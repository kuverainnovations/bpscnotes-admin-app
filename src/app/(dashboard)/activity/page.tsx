'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Search, RefreshCw, User, Clock } from 'lucide-react'

const ACTION_META: Record<string, { emoji: string; label: string; color: string }> = {
  user_registered:          { emoji: '🎉', label: 'Registered',        color: 'bg-green-50 text-green-700 border-green-200' },
  user_login_otp:           { emoji: '🔐', label: 'Login (OTP)',        color: 'bg-blue-50 text-blue-700 border-blue-200' },
  user_login_mpin:          { emoji: '🔑', label: 'Login (MPIN)',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  user_logout:              { emoji: '👋', label: 'Logged Out',         color: 'bg-slate-50 text-slate-600 border-slate-200' },
  user_mpin_created:        { emoji: '🔒', label: 'MPIN Created',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  user_mpin_changed:        { emoji: '🔄', label: 'MPIN Changed',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  user_mpin_reset:          { emoji: '♻️', label: 'MPIN Reset',         color: 'bg-orange-50 text-orange-700 border-orange-200' },
  user_profile_updated:     { emoji: '✏️', label: 'Profile Updated',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  user_avatar_uploaded:     { emoji: '🖼️', label: 'Avatar Uploaded',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  user_account_deleted:     { emoji: '❌', label: 'Account Deleted',    color: 'bg-red-50 text-red-700 border-red-200' },
  course_enrolled:          { emoji: '📚', label: 'Enrolled',           color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  course_review_submitted:  { emoji: '⭐', label: 'Course Review',      color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  lesson_completed:         { emoji: '✅', label: 'Lesson Done',        color: 'bg-green-50 text-green-700 border-green-200' },
  quiz_started:             { emoji: '📝', label: 'Quiz Started',       color: 'bg-amber-50 text-amber-700 border-amber-200' },
  quiz_submitted:           { emoji: '🏆', label: 'Quiz Submitted',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  material_uploaded:        { emoji: '📤', label: 'Uploaded Material',  color: 'bg-teal-50 text-teal-700 border-teal-200' },
  material_downloaded:      { emoji: '📥', label: 'Downloaded',         color: 'bg-teal-50 text-teal-700 border-teal-200' },
  material_purchased:       { emoji: '💳', label: 'Purchased Material', color: 'bg-green-50 text-green-700 border-green-200' },
  material_bookmarked:      { emoji: '🔖', label: 'Bookmarked',         color: 'bg-slate-50 text-slate-600 border-slate-200' },
  study_session_started:    { emoji: '⏱️', label: 'Session Started',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  study_session_ended:      { emoji: '⏹️', label: 'Session Ended',      color: 'bg-blue-50 text-blue-600 border-blue-200' },
  tier_promoted:            { emoji: '🎖️', label: 'Tier Promoted',      color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  live_class_registered:    { emoji: '🎥', label: 'Live Class Reg.',    color: 'bg-pink-50 text-pink-700 border-pink-200' },
  coins_awarded:            { emoji: '🪙', label: 'Coins Awarded',      color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  subscription_started:     { emoji: '💎', label: 'Subscribed',         color: 'bg-purple-50 text-purple-700 border-purple-200' },
  job_saved:                { emoji: '💼', label: 'Job Saved',          color: 'bg-slate-50 text-slate-600 border-slate-200' },
  referral_used:            { emoji: '🤝', label: 'Referral Used',      color: 'bg-green-50 text-green-700 border-green-200' },
}

const ACTION_GROUPS = [
  { label: 'All Actions', value: '' },
  { label: '🔐 Auth',     value: 'auth' },
  { label: '📚 Courses',  value: 'course' },
  { label: '📝 Quizzes',  value: 'quiz' },
  { label: '📄 Materials',value: 'material' },
  { label: '⏱️ Sessions', value: 'study_session' },
  { label: '💎 Premium',  value: 'subscription' },
]

function fmtDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ActivityPage() {
  const { showToast, ToastComponent } = useToast()
  const [search, setSearch]         = useState('')
  const [actionFilter, setAction]   = useState('')
  const [page, setPage]             = useState(1)

  const qs = new URLSearchParams({ page: String(page), limit: '50',
    ...(search && { search }), ...(actionFilter && { action: actionFilter }) }).toString()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.activity?.list(qs) || Promise.resolve({ data: { logs: [], total: 0 } }),
    [qs]
  )

  const logs: any[] = data?.logs || []
  const total = data?.total || 0

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="User Activity Log" subtitle="Every action tracked with timestamp" />

      <div className="p-6 space-y-4 max-w-7xl mx-auto">

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user name, action..." className="input pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ACTION_GROUPS.map(g => (
              <button key={g.value}
                onClick={() => { setAction(g.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  actionFilter === g.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
          <button onClick={refetch} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total.toLocaleString()} total events</span>
          <span>Page {page} · showing {logs.length}</span>
        </div>

        {/* Log Table */}
        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-16 text-slate-400">No activity logs yet</td></tr>
                ) : logs.map((log: any) => {
                  const meta = ACTION_META[log.action] || { emoji: '📌', label: log.action, color: 'bg-slate-50 text-slate-600 border-slate-200' }
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock size={11} className="text-slate-400"/>
                          {fmtDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                            <User size={12} className="text-brand-600"/>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-xs leading-none">{log.user_name || '—'}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{log.user_mobile || log.user_id?.slice(0,8) || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-semibold border ${meta.color}`}>
                          {meta.emoji} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-slate-600 truncate">{log.description || '—'}</p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                            {JSON.stringify(log.metadata)}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-center gap-3">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-secondary px-4 py-2 disabled:opacity-40">← Prev</button>
            <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total/50)}</span>
            <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
              className="btn-secondary px-4 py-2 disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}