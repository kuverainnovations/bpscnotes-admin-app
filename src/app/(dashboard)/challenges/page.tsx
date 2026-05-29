'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, RefreshCw, X, Zap, Loader2, Trophy, Target, Users, Calendar, CheckCircle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const GOAL_TYPES = [
  { value:'study_hours', label:'Study Hours',  hint:'Target in hours, e.g. 5 for 5 hours' },
  { value:'quizzes',     label:'Quizzes',      hint:'Number of quizzes to complete' },
  { value:'goals',       label:'Daily Goals',  hint:'Number of daily targets to complete' },
  { value:'sessions',    label:'Sessions',     hint:'Number of study sessions to start' },
  { value:'streak_days', label:'Streak Days',  hint:'Consecutive study days maintained' },
]

// Same emoji groups as achievements
const EMOJI_GROUPS = [
  { label:'Achievements', emojis:['🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🌟','⭐','💫','✨','🎯'] },
  { label:'Study',        emojis:['📚','📝','✏️','🎓','📖','🔬','🧪','💡','🔭','📐','⚡','🎪'] },
  { label:'Challenges',   emojis:['🚀','🔥','💪','🦅','🏹','⚔️','🛡️','💥','🌈','🎮','🕹️','🎲'] },
  { label:'Fun',          emojis:['🎉','🎊','🎈','🎁','🎀','🎸','🎵','🎶','🌸','🌻','🍀','🦋'] },
]

const TIER_META: Record<string,{label:string;emoji:string}> = {
  starter:   { label:'Starter',    emoji:'🌱' },
  serious:   { label:'Serious',    emoji:'⚡' },
  consistent:{ label:'Consistent', emoji:'💎' },
  achiever:  { label:'Achiever',   emoji:'🏆' },
}

function NumInput({ value, onChange, placeholder='', min=0 }: any) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  useEffect(() => { setRaw(value===0?'':String(value)) }, [value])
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={min}
      onChange={e => { setRaw(e.target.value); const n=parseInt(e.target.value); if(!isNaN(n)) onChange(n) }}
      onBlur={() => { if(!raw.trim()) { setRaw(''); onChange(0) } }}/>
  )
}

function weekKey(offset = 0) {
  const now   = new Date(); now.setDate(now.getDate() + offset * 7)
  const start = new Date(now.getFullYear(), 0, 1)
  const w     = Math.ceil(((now.getTime()-start.getTime())/86400000+start.getDay()+1)/7)
  return `${now.getFullYear()}-W${String(w).padStart(2,'0')}`
}

const emptyForm = {
  title:'', description:'', emoji:'🎯', periodKey:weekKey(), targetTierId:'',
  goal:{ type:'study_hours', target:5 }, coinsReward:20, xpReward:100, isActive:true,
}

export default function ChallengesPage() {
  const { showToast, ToastComponent } = useToast()
  const [challenges, setChallenges] = useState<any[]>([])
  const [tiers, setTiers]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setModal]       = useState(false)
  const [form, setForm]             = useState<any>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [weekFilter, setWeek]       = useState(weekKey())
  const [showEmojiPicker, setShowEmoji] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [chalRes, tierRes] = await Promise.all([
        api.adminChallenges.list({ week: weekFilter }),
        api.tierRooms.getAllTiers(),
      ])
      setChallenges(chalRes.data?.challenges || [])
      setTiers(tierRes.data?.tiers || [])
    } catch (e: any) { showToast(e.message||'Failed to load', 'error') }
    finally { setLoading(false) }
  }, [weekFilter])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return }
    if (form.goal.target <= 0) { showToast('Goal target must be > 0', 'error'); return }
    setSaving(true)
    try {
      await api.adminChallenges.create({ ...form, targetTierId: form.targetTierId||null })
      setModal(false); setForm({...emptyForm, periodKey:weekFilter})
      showToast('Challenge created ✅'); load()
    } catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setSaving(false) }
  }

  const toggle = async (id: string, isActive: boolean) => {
    try { await api.adminChallenges.toggle(id, !isActive); load() }
    catch (e: any) { showToast(e.message||'Failed', 'error') }
  }

  const goalMeta = GOAL_TYPES.find(g => g.value === form.goal.type)

  const stats = [
    { emoji:'⚡', label:'Total',      value:challenges.length,                            color:'text-slate-700',  bg:'bg-slate-50' },
    { emoji:'✅', label:'Active',     value:challenges.filter(c=>c.is_active).length,     color:'text-green-700',  bg:'bg-green-50' },
    { emoji:'🏆', label:'Completed',  value:challenges.reduce((a:number,c:any)=>a+(c.completions||0),0), color:'text-amber-700', bg:'bg-amber-50' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Weekly Challenges" subtitle="Create challenges for each week — auto-resets every Sunday" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Week filter + actions */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Calendar size={13} className="text-slate-400"/>
            <select value={weekFilter} onChange={e => setWeek(e.target.value)}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              {[-1,0,1].map(offset => {
                const k = weekKey(offset)
                return <option key={k} value={k}>{k} {offset===0?'· this week':offset===-1?'· last week':'· next week'}</option>
              })}
            </select>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={() => { setForm({...emptyForm,periodKey:weekFilter}); setModal(true); setShowEmoji(false) }}
            className="btn-primary ml-auto"><Plus size={14}/> New Challenge</button>
        </div>

        {/* Challenges grid */}
        {loading ? (
          <div className="card p-16 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-400"/></div>
        ) : challenges.length === 0 ? (
          <div className="card p-16 text-center">
            <Zap size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No challenges for {weekFilter}</p>
            <p className="text-sm text-slate-400 mb-4">Create challenges to motivate students this week</p>
            <button onClick={() => { setForm({...emptyForm,periodKey:weekFilter}); setModal(true) }}
              className="btn-primary mx-auto"><Plus size={14}/> Create Challenge</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {challenges.map((ch: any) => {
              const tierKey = (ch.target_tier_name||'').toLowerCase()
              const tierMeta = TIER_META[tierKey]
              return (
                <div key={ch.id} className={`card p-0 overflow-hidden hover:shadow-md transition-shadow ${!ch.is_active?'opacity-60':''}`}>
                  {/* Color bar */}
                  <div className={`h-1 ${ch.is_active?'bg-brand-400':'bg-slate-200'}`}/>
                  <div className="p-5 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-2xl shrink-0">
                          {ch.emoji}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{ch.title}</p>
                          {tierMeta && (
                            <p className="text-xs text-slate-400 mt-0.5">{tierMeta.emoji} {tierMeta.label} tier only</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => toggle(ch.id, ch.is_active)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shrink-0
                          ${ch.is_active?'bg-green-100 text-green-700 hover:bg-green-200':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {ch.is_active?'Active':'Paused'}
                      </button>
                    </div>

                    {ch.description && <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{ch.description}</p>}

                    {/* Goal + rewards */}
                    <div className="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Target size={13} className="text-brand-500 shrink-0"/>
                        <span className="text-xs font-bold text-slate-700">
                          {GOAL_TYPES.find(g=>g.value===ch.goal?.type)?.label||ch.goal?.type} ≥ {ch.goal?.target}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                        {ch.coins_reward > 0 && <span>🪙 +{ch.coins_reward} coins</span>}
                        {ch.xp_reward    > 0 && <span>⚡ +{ch.xp_reward} XP</span>}
                        {(ch.completions||0) > 0 && (
                          <span className="flex items-center gap-1 text-green-600 font-medium ml-auto">
                            <CheckCircle size={10}/> {formatNumber(ch.completions)} done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">{form.emoji}</div>
                <div>
                  <h3 className="font-bold text-white text-lg">New Weekly Challenge</h3>
                  <p className="text-white/60 text-xs">Resets every Sunday · students see it in app</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Emoji picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Challenge Icon</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowEmoji(!showEmojiPicker)}
                    className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-200 flex items-center justify-center text-3xl hover:bg-brand-100 transition-colors shrink-0">
                    {form.emoji}
                  </button>
                  <div className="flex-1">
                    <input value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})}
                      className="input w-full text-center text-xl" placeholder="Emoji…" maxLength={2}/>
                    <p className="text-[10px] text-slate-400 mt-1">Click icon to browse or type directly</p>
                  </div>
                </div>
                {showEmojiPicker && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 max-h-44 overflow-y-auto">
                    {EMOJI_GROUPS.map(g => (
                      <div key={g.label}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{g.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.emojis.map(e => (
                            <button key={e} onClick={() => { setForm({...form,emoji:e}); setShowEmoji(false) }}
                              className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-colors hover:bg-white hover:shadow-sm ${form.emoji===e?'bg-brand-100 ring-2 ring-brand-400':''}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title + description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({...form,title:e.target.value})}
                  className="input w-full" placeholder="e.g. Study 5 hours this week" autoFocus/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})}
                  rows={2} className="input resize-none w-full" placeholder="Brief challenge description for students…"/>
              </div>

              {/* Goal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Goal Type</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.goal.type} onChange={e => setForm({...form,goal:{...form.goal,type:e.target.value}})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  {goalMeta && <p className="text-[10px] text-slate-400 mt-1">{goalMeta.hint}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Value</label>
                  <NumInput value={form.goal.target} onChange={(v:number)=>setForm({...form,goal:{...form.goal,target:v}})} placeholder="5" min={1}/>
                </div>
              </div>

              {/* Week + tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Week</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.periodKey} onChange={e => setForm({...form,periodKey:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {[-1,0,1,2].map(offset => {
                        const k = weekKey(offset)
                        return <option key={k} value={k}>{k}{offset===0?' (this week)':offset===-1?' (last week)':''}</option>
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Tier</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.targetTierId} onChange={e => setForm({...form,targetTierId:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      <option value="">All tiers</option>
                      {tiers.map((t:any) => {
                        const m = TIER_META[(t.key||t.name||'').toLowerCase()] || { label:t.name, emoji:'🎯' }
                        return <option key={t.id} value={t.id}>{m.emoji} {m.label}</option>
                      })}
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty = visible to all tiers</p>
                </div>
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins Reward</label>
                  <NumInput value={form.coinsReward} onChange={(v:number)=>setForm({...form,coinsReward:v})} placeholder="20"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">⚡ XP Reward</label>
                  <NumInput value={form.xpReward} onChange={(v:number)=>setForm({...form,xpReward:v})} placeholder="100"/>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title.trim()}
                className="btn-primary disabled:opacity-40">
                {saving?<><Loader2 size={14} className="animate-spin"/> Saving…</>:'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}