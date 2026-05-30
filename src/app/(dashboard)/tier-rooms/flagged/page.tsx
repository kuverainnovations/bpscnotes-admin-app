'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { RefreshCw, AlertTriangle, CheckCircle, X, Shield } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// FILE: admin/src/app/(dashboard)/tier-rooms/flagged/page.tsx
// Anti-cheat review panel — shows users flagged by the system
// ─────────────────────────────────────────────────────────────

const REASON_META: Record<string, { label: string; color: string; emoji: string }> = {
  heartbeat_velocity: { label: 'Heartbeat Too Fast',  color: 'text-orange-700 bg-orange-50 border-orange-200', emoji: '⚡' },
  afk_ratio:          { label: 'High AFK Ratio',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200', emoji: '💤' },
  coin_velocity:      { label: 'Coin Velocity',        color: 'text-red-700 bg-red-50 border-red-200',         emoji: '🚨' },
  short_session:      { label: 'Very Short Session',   color: 'text-blue-700 bg-blue-50 border-blue-200',      emoji: '⏱️' },
  concurrent_session: { label: 'Concurrent Sessions',  color: 'text-purple-700 bg-purple-50 border-purple-200',emoji: '👥' },
}

export default function FlaggedUsersPage() {
  const [users, setUsers]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const [clearing, setClearing] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.tierRooms.getFlaggedUsers({ page: 1, limit: 50 })
      setUsers(res.data?.flaggedUsers || [])
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const clearFlags = async (userId: string, name: string) => {
    if (!confirm(`Clear all flags for ${name}? This marks them as reviewed.`)) return
    setClearing(userId)
    try {
      await api.tierRooms.clearUserFlags(userId)
      flash('✅ Flags cleared for ' + name)
      load()
    } catch (e: any) { flash('❌ ' + e.message) }
    finally { setClearing(null) }
  }

  const uniqueUsers = Array.from(
    users.reduce((map, row) => {
      if (!map.has(row.user_id)) map.set(row.user_id, { ...row, flags: [] })
      map.get(row.user_id).flags.push(row)
      return map
    }, new Map()).values()
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Flagged Users — Anti-Cheat"
        subtitle="Users flagged by the automatic cheat detection system"
      />
      <div className="p-6 space-y-5">
        {msg && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg}
          </div>
        )}

        <div className="card p-4 flex items-center gap-3 bg-amber-50 border border-amber-200">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">How this works</p>
            <p className="text-xs mt-0.5">
              The system automatically flags users with suspicious patterns (too-fast heartbeats,
              {" > "}60% AFK ratio, coin velocity exceeding the daily maximum). Review each case —
              most are network issues, not genuine cheating. Click "Clear" after reviewing.
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-slate-500" />
            <p className="font-semibold text-slate-800">{uniqueUsers.length} flagged users</p>
          </div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? (
          <div className="card p-12 text-center text-slate-400">Loading...</div>
        ) : uniqueUsers.length === 0 ? (
          <div className="card p-16 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={40} className="text-green-400" />
            <p className="font-semibold text-slate-800">No flagged users</p>
            <p className="text-sm text-slate-500">The system hasn't detected any suspicious activity.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(uniqueUsers as any[]).map((user: any) => (
              <div key={user.user_id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{user.user_id}</p>
                    {user.mobile && <p className="text-xs text-slate-500">{user.mobile}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {user.total_flags} flag{user.total_flags !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => clearFlags(user.user_id, user.name)}
                      disabled={clearing === user.user_id}
                      className="btn-secondary text-xs py-1 px-3 text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle size={12} />
                      {clearing === user.user_id ? 'Clearing…' : 'Clear Flags'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {user.flags?.slice(0, 5).map((flag: any, i: number) => {
                    const meta = REASON_META[flag.reason] || { label: flag.reason, color: 'text-slate-700 bg-slate-50 border-slate-200', emoji: '⚠️' }
                    return (
                      <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs ${meta.color}`}>
                        <span className="text-base shrink-0 mt-0.5">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{meta.label}</p>
                          {flag.details && <p className="text-xs opacity-80 mt-0.5 break-words">{flag.details}</p>}
                        </div>
                        <p className="text-xs opacity-60 shrink-0">
                          {new Date(flag.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    )
                  })}
                  {user.flags?.length > 5 && (
                    <p className="text-xs text-slate-400 text-center">+{user.flags.length - 5} more flags…</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}