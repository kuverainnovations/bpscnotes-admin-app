'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, RefreshCw, Trophy, X, CheckCircle, Loader2 } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const CATEGORIES  = ['study','streak','quiz','social','tier','challenge']
const COND_TYPES  = [
  { value:'study_hours',  label:'Study Hours',   hint:'Total accumulated study hours' },
  { value:'streak_days',  label:'Streak Days',   hint:'Consecutive study days' },
  { value:'quizzes',      label:'Quizzes Done',  hint:'Total quizzes completed' },
  { value:'goals',        label:'Daily Goals',   hint:'Total daily goals completed' },
  { value:'tier_reach',   label:'Tier Reached',  hint:'User has reached this tier' },
  { value:'coins',        label:'Coins Earned',  hint:'Total coins ever earned' },
]
const TIER_KEYS = ['starter','serious','consistent','achiever']

// Issue 3: Large emoji set grouped by topic
const EMOJI_GROUPS = [
  { label:'Achievements', emojis:['🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🌟','⭐','💫','✨','🏆'] },
  { label:'Study',        emojis:['📚','📝','✏️','🎓','📖','🔬','🧪','💡','🔭','📐','📏','🖊️'] },
  { label:'Fire/Energy',  emojis:['🔥','⚡','💥','🚀','⚡','💪','🎯','🏹','🎪','🌈','🦋','🦅'] },
  { label:'Nature',       emojis:['🌱','🌿','🍀','🌸','🌺','🌻','🍁','🌲','🌴','🏔️','🗻','⛰️'] },
  { label:'Symbols',      emojis:['💎','👑','🛡️','⚔️','🔱','☀️','🌙','❄️','💠','🔮','🎭','🎨'] },
  { label:'Fun',          emojis:['🎉','🎊','🎈','🎁','🎀','🎮','🕹️','🎲','🎸','🎵','🎶','🎤'] },
]

const CAT_META: Record<string,{color:string;bg:string;border:string}> = {
  study:     { color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200' },
  streak:    { color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200' },
  quiz:      { color:'text-purple-700', bg:'bg-purple-50', border:'border-purple-200' },
  social:    { color:'text-teal-700',   bg:'bg-teal-50',   border:'border-teal-200' },
  tier:      { color:'text-amber-700',  bg:'bg-amber-50',  border:'border-amber-200' },
  challenge: { color:'text-indigo-700', bg:'bg-indigo-50', border:'border-indigo-200' },
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

const emptyForm = { key:'', title:'', description:'', emoji:'🏅', category:'study',
  condition:{ type:'study_hours', threshold:10 }, coinsReward:0, xpReward:0, sortOrder:0, isActive:true }

export default function AchievementsPage() {
  const { showToast, ToastComponent } = useToast()
  const [list, setList]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setModal] = useState(false)
  const [form, setForm]     = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmoji] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.adminAchievements.list(); setList(r.data?.achievements||[]) }
    catch (e: any) { showToast(e.message||'Failed to load achievements', 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.key.trim() || !form.title.trim()) { showToast('Key and title are required', 'error'); return }
    setSaving(true)
    try { await api.adminAchievements.create(form); setModal(false); setForm(emptyForm); showToast('Achievement created ✅'); load() }
    catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setSaving(false) }
  }

  const toggle = async (id: string, isActive: boolean) => {
    try { await api.adminAchievements.toggle(id, !isActive); load(); showToast('Updated ✅') }
    catch (e: any) { showToast(e.message||'Failed to update', 'error') }
  }

  const condType = COND_TYPES.find(c => c.value === form.condition?.type)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Achievements" subtitle="Create and manage study achievement badges" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji:'🏅', label:'Total', value:list.length, color:'text-slate-700', bg:'bg-slate-50' },
            { emoji:'✅', label:'Active', value:list.filter(a=>a.is_active).length, color:'text-green-700', bg:'bg-green-50' },
            { emoji:'🏆', label:'Total Earned', value:formatNumber(list.reduce((s:number,a:any)=>s+(a.earned_count||0),0)), color:'text-amber-700', bg:'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14}/> New Achievement</button>
        </div>

        {/* Achievement cards */}
        {loading ? (
          <div className="card p-16 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-400"/></div>
        ) : list.length === 0 ? (
          <div className="card p-16 text-center">
            <Trophy size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No achievements yet</p>
            <button onClick={() => setModal(true)} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Create First Achievement</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(a => {
              const meta = CAT_META[a.category] || CAT_META.study
              return (
                <div key={a.id} className={`card p-5 hover:shadow-md transition-shadow ${!a.is_active?'opacity-60':''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center text-2xl`}>{a.emoji}</div>
                      <div>
                        <p className="font-bold text-slate-900">{a.title}</p>
                        <p className="text-xs text-slate-400">{a.description}</p>
                      </div>
                    </div>
                    <span className={`badge text-[10px] ${a.is_active?'bg-green-100 text-green-700 border-green-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {a.is_active?'Active':'Off'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${meta.bg} ${meta.color} ${meta.border}`}>{a.category}</span>
                    {a.coins_reward > 0 && <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[10px]">🪙 {a.coins_reward}</span>}
                    {a.xp_reward    > 0 && <span className="badge bg-blue-50 text-blue-700 border-blue-200 text-[10px]">⚡ {a.xp_reward} XP</span>}
                    {a.earned_count > 0 && <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[10px]">🏆 {formatNumber(a.earned_count)} earned</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggle(a.id, a.is_active)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${a.is_active?'bg-red-50 hover:bg-red-100 text-red-600':'bg-green-50 hover:bg-green-100 text-green-600'}`}>
                      {a.is_active?'Disable':'Enable'}
                    </button>
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

            <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">{form.emoji}</div>
                <div>
                  <h3 className="font-bold text-white text-lg">New Achievement</h3>
                  <p className="text-white/60 text-xs">Awarded when users reach milestones</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Emoji picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Badge Icon</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowEmoji(!showEmojiPicker)}
                    className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-3xl hover:bg-amber-100 transition-colors shrink-0">
                    {form.emoji}
                  </button>
                  <div className="flex-1">
                    <input value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})}
                      className="input w-full text-center text-xl" placeholder="Emoji…" maxLength={2}/>
                    <p className="text-[10px] text-slate-400 mt-1">Click badge or type emoji directly</p>
                  </div>
                </div>
                {showEmojiPicker && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 max-h-48 overflow-y-auto">
                    {EMOJI_GROUPS.map(g => (
                      <div key={g.label}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{g.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.emojis.map(e => (
                            <button key={e} onClick={() => { setForm({...form,emoji:e}); setShowEmoji(false) }}
                              className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-colors hover:bg-white hover:shadow-sm ${form.emoji===e?'bg-amber-100 ring-2 ring-amber-400':''}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Key * <span className="font-normal text-slate-400">(snake_case)</span></label>
                  <input value={form.key} onChange={e => setForm({...form,key:e.target.value.toLowerCase().replace(/\s+/g,'_')})}
                    className="input font-mono text-sm" placeholder="e.g. first_quiz"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="input" placeholder="Quiz Beginner"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="input w-full" placeholder="Complete your first quiz"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full capitalize">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Condition Type</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.condition.type}
                      onChange={e => setForm({...form,condition:{...form.condition,type:e.target.value}})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {condType && <p className="text-[10px] text-slate-400 mt-1">{condType.hint}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {form.condition.type==='tier_reach'?'Tier':'Threshold'}
                  </label>
                  {form.condition.type==='tier_reach' ? (
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <select value={form.condition.threshold}
                        onChange={e => setForm({...form,condition:{...form.condition,threshold:e.target.value}})}
                        className="text-sm bg-transparent outline-none text-slate-700 w-full capitalize">
                        {TIER_KEYS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <NumInput value={form.condition.threshold} onChange={(v:number)=>setForm({...form,condition:{...form.condition,threshold:v}})} placeholder="10" min={1}/>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins</label>
                  <NumInput value={form.coinsReward} onChange={(v:number)=>setForm({...form,coinsReward:v})} placeholder="50"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">⚡ XP</label>
                  <NumInput value={form.xpReward} onChange={(v:number)=>setForm({...form,xpReward:v})} placeholder="100"/>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.key.trim()||!form.title.trim()} className="btn-primary disabled:opacity-40">
                {saving?<><Loader2 size={14} className="animate-spin"/> Saving…</>:'Create Achievement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}