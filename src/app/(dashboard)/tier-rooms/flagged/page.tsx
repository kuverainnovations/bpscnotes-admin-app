'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { RefreshCw, AlertTriangle, CheckCircle, X, Shield, User, Clock, Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const REASON_META: Record<string,{label:string;color:string;bg:string;emoji:string}> = {
  heartbeat_velocity: { label:'Heartbeat Too Fast', emoji:'⚡', color:'text-orange-700', bg:'bg-orange-50 border-orange-200' },
  afk_ratio:          { label:'High AFK Ratio',      emoji:'💤', color:'text-yellow-700', bg:'bg-yellow-50 border-yellow-200' },
  coin_velocity:      { label:'Coin Velocity',        emoji:'🚨', color:'text-red-700',    bg:'bg-red-50 border-red-200' },
  short_session:      { label:'Very Short Session',   emoji:'⏱️', color:'text-blue-700',   bg:'bg-blue-50 border-blue-200' },
  concurrent_session: { label:'Concurrent Sessions',  emoji:'👥', color:'text-purple-700', bg:'bg-purple-50 border-purple-200' },
}

export default function FlaggedUsersPage() {
  const { showToast, ToastComponent } = useToast()
  const [users, setUsers]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.tierRooms.getFlaggedUsers({ page:1, limit:50 })
      setUsers(res.data?.flaggedUsers || [])
    } catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const clearFlags = async (userId: string, name: string) => {
    if (!confirm(`Clear all flags for ${name}?`)) return
    setClearing(userId)
    try { await api.tierRooms.clearUserFlags(userId); showToast(`Flags cleared ✅`); load() }
    catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setClearing(null) }
  }

  // Group by user
  const byUser = users.reduce((acc: any, flag: any) => {
    const uid = flag.user_id||flag.userId
    if (!acc[uid]) acc[uid] = { ...flag, flags: [] }
    acc[uid].flags.push(flag)
    return acc
  }, {})
  const grouped = Object.values(byUser) as any[]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Anti-Cheat Review" subtitle="Review flagged users detected by the automated cheat detection system"/>

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Back + refresh */}
        <div className="flex items-center justify-between">
          <Link href="/tier-rooms" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium">
            <ChevronLeft size={16}/> Back to Tier Rooms
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle size={14} className="text-red-600"/>
              <span className="text-sm font-semibold text-red-700">{grouped.length} flagged user{grouped.length!==1?'s':''}</span>
            </div>
            <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          </div>
        </div>

        {loading ? (
          <div className="card p-16 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-400"/></div>
        ) : grouped.length === 0 ? (
          <div className="card p-16 text-center">
            <Shield size={40} className="mx-auto mb-4 text-green-300"/>
            <p className="font-bold text-green-700 text-lg mb-1">All Clear</p>
            <p className="text-sm text-slate-400">No flagged users at the moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((u: any) => {
              const uid  = u.user_id || u.userId
              const name = u.user_name || u.userName || 'Unknown User'
              return (
                <div key={uid} className="card p-5 border-l-4 border-l-red-400">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <User size={18} className="text-red-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="font-bold text-slate-900">{name}</p>
                        <span className="text-[10px] font-mono text-slate-400">{uid?.slice(0,8)}…</span>
                        <span className="badge bg-red-100 text-red-700 border-red-200">{u.flags.length} flag{u.flags.length!==1?'s':''}</span>
                      </div>
                      {/* Flag pills */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {u.flags.map((flag: any, i: number) => {
                          const reason = flag.flagReason || flag.flag_reason || 'unknown'
                          const meta   = REASON_META[reason] || { label:reason, emoji:'⚠️', color:'text-slate-700', bg:'bg-slate-50 border-slate-200' }
                          return (
                            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${meta.bg} ${meta.color}`}>
                              <span>{meta.emoji}</span> {meta.label}
                              {flag.sessionId && <span className="text-[10px] opacity-60 ml-1">sess:{flag.sessionId?.slice(0,6)}</span>}
                            </div>
                          )
                        })}
                      </div>
                      {/* Timestamp */}
                      {u.createdAt && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10}/> First flagged: {new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </p>
                      )}
                    </div>
                    <button onClick={() => clearFlags(uid, name)} disabled={clearing===uid}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold rounded-xl border border-green-200 transition-colors shrink-0">
                      {clearing===uid ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle size={13}/>}
                      Clear
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}