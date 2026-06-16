'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import {
  Search, RefreshCw, Eye, Ban, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Coins, Trophy, Zap, BookOpen, Clock, MapPin, Phone,
  Mail, Calendar, TrendingUp, Shield, Star, GraduationCap,
  Users, Filter, Award, AlertTriangle, X,
} from 'lucide-react'

const LIMIT = 20

function StatBadge({ icon, value, color }: { icon: React.ReactNode; value: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {icon} {value}
    </span>
  )
}

// ── Tooltip wrapper ──────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  )
}

// ── User Detail Modal ────────────────────────────────────────
function UserDetailModal({ user, onClose, onUpdateStatus }:
  { user: any; onClose: () => void; onUpdateStatus: (id:string,s:string)=>void }) {

  const isBanned = user.status === 'banned'
  const accuracy = parseFloat(user.accuracy || 0)

  const stats = [
    { icon: <Zap  size={16} />,      label: 'Streak',      value: `${user.streak ?? 0} days`,             color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
    { icon: <Coins size={16} />,     label: 'Coins',       value: formatNumber(user.coins ?? 0),           color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
    { icon: <TrendingUp size={16}/>, label: 'Accuracy',    value: `${accuracy.toFixed(1)}%`,               color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
    { icon: <BookOpen size={16} />,  label: 'Quizzes',     value: formatNumber(user.quizzes_attempted??0), color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { icon: <Clock size={16} />,     label: 'Study Time',  value: `${Math.round((user.total_study_minutes??0)/60)}h`, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    { icon: <Trophy size={16} />,    label: 'Rank',        value: user.rank ? `#${user.rank}` : '—',       color: 'text-brand-600',  bg: 'bg-brand-50 border-brand-100' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* ── Header gradient banner ───────────────────────── */}
        <div className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 rounded-t-3xl overflow-hidden">
          {/* BG decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Close button — above overflow-hidden layer via z-index */}
          <button
            onClick={e => { e.stopPropagation(); onClose() }}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-white" />
          </button>

          <div className="flex items-center gap-4 relative">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-2xl shadow-lg ring-2 ring-white/30">
              {user.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                {user.is_verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-400/30 rounded-full text-white text-xs font-semibold">
                    <CheckCircle size={10} /> Verified
                  </span>
                )}
              </div>
              <p className="text-white/70 text-sm mt-0.5">{user.email || '—'}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
                  ${user.status === 'active' ? 'bg-green-400/30 text-green-100' : user.status === 'banned' ? 'bg-red-400/30 text-red-100' : 'bg-slate-400/30 text-slate-100'}`}>
                  {user.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />} {user.status}
                </span>
                {user.subscription && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-400/30 rounded-full text-purple-100 text-xs font-bold">
                    <Star size={10} /> {user.subscription}
                  </span>
                )}
                {!user.subscription && (
                  <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/60 text-xs font-medium">Free Plan</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-slate-100">
          {stats.map(s => (
            <div key={s.label} className={`rounded-2xl border p-3.5 flex flex-col gap-1.5 ${s.bg}`}>
              <div className={`${s.color}`}>{s.icon}</div>
              <p className="text-lg font-black text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Details section ───────────────────────────────── */}
        <div className="p-5 space-y-4">

          {/* Contact & Location */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact & Location</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: <Phone size={13} />,       label: 'Mobile',     value: user.mobile || '—' },
                { icon: <Mail size={13} />,         label: 'Email',      value: user.email || '—' },
                { icon: <MapPin size={13} />,       label: 'District',   value: user.district || '—' },
                { icon: <Calendar size={13} />,     label: 'Joined',     value: user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Profile */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Exam Profile</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: <GraduationCap size={13} />, label: 'Primary Exam',  value: user.primary_exam   || '—' },
                { icon: <Award size={13} />,         label: 'Prep Level',    value: user.prep_level     || '—' },
                { icon: <Calendar size={13} />,      label: 'Target Year',   value: user.target_year    || '—' },
                { icon: <Shield size={13} />,        label: 'User Role',     value: user.role           || 'user' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate capitalize">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy bar */}
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Quiz Accuracy</p>
              <span className="text-sm font-black text-brand-600">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${accuracy}%`,
                  background: accuracy >= 75 ? '#10B981' : accuracy >= 50 ? '#1565C0' : '#F59E0B',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { onUpdateStatus(user.id, isBanned ? 'active' : 'banned'); onClose() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors border
                ${isBanned
                  ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'}`}
            >
              {isBanned ? <><CheckCircle size={15} /> Unban User</> : <><Ban size={15} /> Ban User</>}
            </button>
          </div>

          {/* Award Coins */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Award Coins Manually</p>
            <div className="flex gap-2">
              <input id={`coins-${user.id}`} type="number" min="1" max="10000"
                placeholder="Enter amount..." className="input flex-1 text-sm" />
              <button
                onClick={async () => {
                  const el = document.getElementById(`coins-${user.id}`) as HTMLInputElement
                  const amt = parseInt(el?.value || '0')
                  if (!amt || amt <= 0) return
                  try {
                    await api.users.awardCoins(user.id, amt, 'Manual award by admin')
                    onClose()
                  } catch(e: any) { alert(e.message) }
                }}
                className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-xl hover:bg-yellow-600 whitespace-nowrap">
                🪙 Award
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <button
            onClick={async () => {
              if (!confirm(`Permanently delete ${user.name}'s account? This cannot be undone.`)) return
              try {
                await api.users.delete(user.id)
                onClose()
              } catch(e: any) { alert(e.message) }
            }}
            className="w-full py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50">
            🗑️ Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]     = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [plan, setPlan]       = useState('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const { showToast, ToastComponent } = useToast()

  // Issue 1+5: debounce search, real total from API
  const debouncedSearch = useDebounce(search, 400)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.users.list({ search: debouncedSearch, status, plan, page, limit: LIMIT })
      setUsers(res.data?.users || [])
      setTotal(res.meta?.total ?? res.data?.total ?? 0)  // try both meta and data
    } catch (e: any) {
      showToast(e.message || 'Failed to load users', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [debouncedSearch, status, plan, page])

  const updateStatus = async (id: string, s: string) => {
    try {
      await api.users.updateStatus(id, s)
      showToast(`User ${s === 'banned' ? 'banned' : 'unbanned'} ✅`)
      load()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const from       = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to         = Math.min(page * LIMIT, total)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      {/* Issue 1: Real count from API, not static */}
      <Header title="User Management" subtitle={loading ? 'Loading…' : `${formatNumber(total)} total users`} />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Filters bar */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, email, mobile…"
              className="input pl-9"
            />
          </div>

          {/* Issue 2: All filters row with better padding */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <Filter size={12} className="text-slate-400" />
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="text-sm bg-transparent outline-none text-slate-700 pr-1">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <Star size={12} className="text-slate-400" />
              <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1) }} className="text-sm bg-transparent outline-none text-slate-700 pr-1">
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <button onClick={load} className="btn-secondary px-3 py-2" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Summary chips */}
          {total > 0 && !loading && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                Showing {from}–{to} of {formatNumber(total)}
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-16 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['User', 'Joined', 'Streak', 'Coins', 'Plan', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="table-row border-b border-slate-50 hover:bg-slate-50/60 transition-colors">

                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-black shrink-0">
                            {u.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                              {u.name}
                              {u.is_verified && <CheckCircle size={11} className="text-blue-500 shrink-0" />}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-600">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </td>

                      {/* Issue 2: padding fix in badges */}
                      <td className="px-4 py-3.5">
                        <StatBadge icon="🔥" value={`${u.streak ?? 0}d`} color="bg-orange-50 text-orange-700 border-orange-100" />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatBadge icon="🪙" value={formatNumber(u.coins ?? 0)} color="bg-yellow-50 text-yellow-700 border-yellow-100" />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge ${u.subscription ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {u.subscription || 'free'}
                        </span>
                      </td>



                      <td className="px-4 py-3.5">
                        <span className={`badge ${
                          u.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                          u.status === 'banned' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>{u.status}</span>
                      </td>

                      {/* Issue 3: Tooltips on action buttons */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Tooltip label="View details">
                            <button
                              onClick={() => setSelected(u)}
                              className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            >
                              <Eye size={13} className="text-blue-600" />
                            </button>
                          </Tooltip>

                          <Tooltip label={u.status === 'banned' ? 'Unban user' : 'Ban user'}>
                            <button
                              onClick={() => updateStatus(u.id, u.status === 'banned' ? 'active' : 'banned')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                ${u.status === 'banned' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                            >
                              <Ban size={13} className={u.status === 'banned' ? 'text-green-600' : 'text-red-600'} />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="py-20 text-center">
                  <Users size={40} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-400 font-medium">No users found</p>
                  <p className="text-sm text-slate-300 mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>

            {/* Issue 5: Pagination — always visible, full featured */}
            {total > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/40">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{from}</span>–<span className="font-semibold text-slate-700">{to}</span> of <span className="font-semibold text-slate-700">{formatNumber(total)}</span> users
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number
                    if (totalPages <= 7) p = i + 1
                    else if (page <= 4) p = i + 1
                    else if (page >= totalPages - 3) p = totalPages - 6 + i
                    else p = page - 3 + i
                    return p
                  }).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                        ${p === page
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Issue 4: Beautiful user detail modal */}
      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  )
}