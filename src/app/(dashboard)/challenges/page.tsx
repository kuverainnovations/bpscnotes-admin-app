'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { Plus, RefreshCw, X, Zap } from 'lucide-react'

const GOAL_TYPES = [
  { value:'study_hours', label:'Study Hours',  hint:'Target in hours (e.g. 10)' },
  { value:'quizzes',     label:'Quizzes',      hint:'Number of quizzes to complete' },
  { value:'goals',       label:'Daily Goals',  hint:'Number of daily targets to complete' },
  { value:'sessions',    label:'Sessions',     hint:'Number of study sessions to start' },
  { value:'streak_days', label:'Streak Days',  hint:'Consecutive study days' },
]

function weekKey(offset = 0) {
  const now   = new Date(); now.setDate(now.getDate() + offset * 7)
  const start = new Date(now.getFullYear(), 0, 1)
  const w     = Math.ceil(((now.getTime()-start.getTime())/86400000+start.getDay()+1)/7)
  return `${now.getFullYear()}-W${String(w).padStart(2,'0')}`
}

const emptyForm = { title:'', description:'', emoji:'🎯', periodKey: weekKey(), targetTierId:'', goal:{ type:'study_hours', target:10 }, coinsReward:20, xpReward:100, isActive:true }

export default function ChallengesAdminPage() {
  const [challenges, setChallenges] = useState<any[]>([])
  const [tiers, setTiers]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setModal]       = useState(false)
  const [form, setForm]             = useState<any>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [weekFilter, setWeek]       = useState(weekKey())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [chalRes, tierRes] = await Promise.all([
        api.adminChallenges.list({ week: weekFilter }),
        api.tierRooms.getAllTiers(),
      ])
      setChallenges(chalRes.data?.challenges || [])
      setTiers(tierRes.data?.tiers || [])
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setLoading(false) }
  }, [weekFilter])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const save = async () => {
    if (!form.title) { flash('❌ Title is required'); return }
    setSaving(true)
    try {
      await api.adminChallenges.create({ ...form, targetTierId: form.targetTierId || null })
      setModal(false); setForm({ ...emptyForm, periodKey: weekFilter }); flash('✅ Challenge created'); load()
    } catch (e: any) { flash('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  const toggle = async (id: string, isActive: boolean) => {
    try { await api.adminChallenges.toggle(id, !isActive); load() }
    catch (e: any) { flash('❌ ' + e.message) }
  }

  return (
    <div className="min-h-screen">
      <Header title="Weekly Challenges" subtitle="Create challenges that motivate students to study consistently" />
      <div className="p-6 space-y-5">
        {msg && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{msg}</div>}

        <div className="card p-4 flex items-center gap-3 bg-blue-50 border border-blue-200">
          <Zap size={18} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            Challenges reset every week. Create them on Monday morning so students can see them immediately.
            Progress is tracked automatically from study sessions, quizzes, and goal completions.
          </p>
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Week:</label>
            <select value={weekFilter} onChange={e => setWeek(e.target.value)} className="input w-auto">
              {[-1,0,1].map(offset => {
                const k = weekKey(offset)
                return <option key={k} value={k}>{k} {offset === 0 ? '(this week)' : offset === -1 ? '(last week)' : '(next week)'}</option>
              })}
            </select>
          </div>
          <button onClick={load} className="btn-secondary ml-auto"><RefreshCw size={14} /></button>
          <button onClick={() => { setForm({...emptyForm, periodKey: weekFilter}); setModal(true) }} className="btn-primary"><Plus size={14} /> New Challenge</button>
        </div>

        {loading ? <div className="card p-12 text-center text-slate-400">Loading…</div> :
          challenges.length === 0 ? (
            <div className="card p-16 flex flex-col items-center gap-3 text-center">
              <span className="text-5xl">⚡</span>
              <p className="font-semibold text-slate-800">No challenges for {weekFilter}</p>
              <p className="text-sm text-slate-500">Click "New Challenge" to create one for this week.</p>
              <button onClick={() => { setForm({...emptyForm,periodKey:weekFilter}); setModal(true) }} className="btn-primary mt-2"><Plus size={14} /> Create First Challenge</button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {challenges.map((ch: any) => (
                <div key={ch.id} className={`card p-5 ${!ch.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ch.emoji}</span>
                      <div>
                        <p className="font-bold text-slate-900">{ch.title}</p>
                        {ch.target_tier_name && <p className="text-xs text-slate-500">{ch.target_tier_emoji} {ch.target_tier_name} only</p>}
                      </div>
                    </div>
                    <button onClick={() => toggle(ch.id, ch.is_active)} className={`text-xs px-2 py-1 rounded-lg ${ch.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ch.is_active ? 'Active' : 'Paused'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{ch.description}</p>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Goal: <strong>{ch.goal?.type} ≥ {ch.goal?.target}</strong></span>
                      <span className="text-green-600 font-semibold">{ch.completions || 0} completed</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>🪙 +{ch.coins_reward} coins</span><span>⚡ +{ch.xp_reward} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <p className="font-bold text-slate-900 text-lg">New Weekly Challenge</p>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Emoji</label><input value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})} className="input text-center text-xl" /></div>
                <div className="col-span-3"><label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Study 5 hours this week" className="input" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Type</label>
                  <select value={form.goal.type} onChange={e => setForm({...form,goal:{...form.goal,type:e.target.value}})} className="input">
                    {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">{GOAL_TYPES.find(g => g.value === form.goal.type)?.hint}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Value</label>
                  <input type="number" min="1" value={form.goal.target} onChange={e => setForm({...form,goal:{...form.goal,target:+e.target.value}})} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tier (optional — leave empty for all)</label>
                <select value={form.targetTierId} onChange={e => setForm({...form,targetTierId:e.target.value})} className="input">
                  <option value="">All tiers</option>
                  {tiers.map((t:any) => <option key={t.id} value={t.id}>{t.icon_emoji} {t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Week</label><input value={form.periodKey} onChange={e => setForm({...form,periodKey:e.target.value})} className="input" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Coins Reward</label><input type="number" min="0" value={form.coinsReward} onChange={e => setForm({...form,coinsReward:+e.target.value})} className="input" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">XP Reward</label><input type="number" min="0" value={form.xpReward} onChange={e => setForm({...form,xpReward:+e.target.value})} className="input" /></div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving…' : 'Create Challenge'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
