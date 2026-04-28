'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Download, Eye, Ban, CheckCircle, RefreshCw } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [plan, setPlan]         = useState('')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.users.list({ search, status, plan, page, limit: 20 })
      setUsers(res.data?.users || [])
      setTotal(res.meta?.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search, status, plan, page])

  const updateStatus = async (id: string, s: string) => {
    await api.users.updateStatus(id, s)
    load()
  }
  const verify = async (id: string) => {
    await api.users.verify(id)
    load()
  }

  return (
    <div className="min-h-screen">
      <Header title="User Management" subtitle={`${formatNumber(total)} total users`} />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, email, mobile..." className="input pl-9" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="pending">Pending</option>
          </select>
          <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['User','Mobile','Exam','Streak','Coins','Plan','Accuracy','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {u.name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center gap-1">
                            {u.name}
                            {u.is_verified && <CheckCircle size={11} className="text-blue-500" />}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.mobile}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[100px] truncate">{u.primary_exam || '—'}</td>
                    <td className="px-4 py-3"><span className="badge bg-red-50 text-red-600 border-red-100">🔥 {u.streak}d</span></td>
                    <td className="px-4 py-3"><span className="badge bg-yellow-50 text-yellow-700 border-yellow-100">🪙 {formatNumber(u.coins)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.subscription ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {u.subscription || 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{width:`${u.accuracy||0}%`}} />
                        </div>
                        <span className="text-xs font-semibold">{parseFloat(u.accuracy||0).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${getStatusColor(u.status)}`}>{u.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(u)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"><Eye size={13} className="text-blue-600" /></button>
                        {!u.is_verified && (
                          <button onClick={() => verify(u.id)} className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"><CheckCircle size={13} className="text-green-600" /></button>
                        )}
                        <button onClick={() => updateStatus(u.id, u.status === 'banned' ? 'active' : 'banned')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${u.status === 'banned' ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}>
                          <Ban size={13} className={u.status === 'banned' ? 'text-green-600' : 'text-red-600'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-12 text-center text-slate-400">No users found</div>
            )}
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {formatNumber(total)} users</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary disabled:opacity-50">← Prev</button>
              <button disabled={page*20>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}

      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Email',        selected.email||'—'],
                ['Mobile',       selected.mobile],
                ['Primary Exam', selected.primary_exam||'—'],
                ['Prep Level',   selected.prep_level||'—'],
                ['Streak',       `${selected.streak} days`],
                ['Coins',        formatNumber(selected.coins)],
                ['Accuracy',     `${parseFloat(selected.accuracy||0).toFixed(1)}%`],
                ['Quizzes',      selected.quizzes_attempted],
                ['District',     selected.district||'—'],
                ['Joined',       new Date(selected.created_at).toLocaleDateString()],
                ['Subscription', selected.subscription||'Free'],
                ['Status',       selected.status],
              ].map(([k,v]) => (
                <div key={String(k)} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">{k}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
