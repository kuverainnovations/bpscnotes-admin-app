'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import {
  Edit, Save, X, RefreshCw, TrendingUp, Zap, Plus, Trash2,
  Coins, Trophy, CheckCircle, Target, ToggleLeft, ToggleRight,
  AlertCircle, Loader2, Settings, Info,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

// No-zero int input
function NumInput({ value, onChange, placeholder='', min=0, className='' }: any) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  return (
    <input type="number" className={`input ${className}`} value={raw} placeholder={placeholder} min={min}
      onChange={e => { setRaw(e.target.value); const n=parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()||isNaN(Number(raw))) { setRaw(''); onChange(0) } }}/>
  )
}

// All known coin actions in the app — synced with mobile app
const KNOWN_ACTIONS: Record<string,{ label:string; emoji:string; desc:string; defaultCoins:number; defaultMaxPerDay:number }> = {
  daily_checkin:      { label:'Daily Check-in',        emoji:'📅', desc:'User opens app and logs in daily', defaultCoins:2, defaultMaxPerDay:1 },
  quiz_complete:      { label:'Complete Quiz',          emoji:'📝', desc:'Complete any quiz with passing score', defaultCoins:5, defaultMaxPerDay:5 },
  quiz_perfect:       { label:'Perfect Quiz Score',     emoji:'🎯', desc:'Score 100% on a quiz', defaultCoins:10, defaultMaxPerDay:3 },
  course_lesson:      { label:'Complete Lesson',        emoji:'📚', desc:'Finish a video/PDF lesson in a course', defaultCoins:3, defaultMaxPerDay:10 },
  study_session:      { label:'Study Room Session',     emoji:'🏫', desc:'Complete a study room session (30+ min)', defaultCoins:8, defaultMaxPerDay:2 },
  streak_7day:        { label:'7-Day Streak',           emoji:'🔥', desc:'Maintain a 7-day study streak', defaultCoins:20, defaultMaxPerDay:1 },
  streak_30day:       { label:'30-Day Streak',          emoji:'🏆', desc:'Maintain a 30-day study streak', defaultCoins:100, defaultMaxPerDay:1 },
  flashcard_session:  { label:'Flashcard Session',      emoji:'🃏', desc:'Complete a flashcard session', defaultCoins:4, defaultMaxPerDay:3 },
  referral:           { label:'Refer a Friend',         emoji:'🤝', desc:'Refer a new user who signs up', defaultCoins:25, defaultMaxPerDay:5 },
  profile_complete:   { label:'Complete Profile',       emoji:'👤', desc:'Fill in all profile details', defaultCoins:15, defaultMaxPerDay:1 },
  upload_material:    { label:'Upload Study Material',  emoji:'📤', desc:'Upload material approved by admin', defaultCoins:30, defaultMaxPerDay:2 },
  ad_watch:           { label:'Watch Rewarded Ad',      emoji:'📺', desc:'Watch a rewarded ad to earn coins', defaultCoins:10, defaultMaxPerDay:0 },
}

const EMPTY_NEW_RULE = { action:'', description:'', coinsAwarded:5, maxPerDay:1 }

export default function CoinsPage() {
  const { showToast, ToastComponent } = useToast()
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editVals, setEditVals]   = useState({ coins:0, maxPerDay:1 })
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [newRule, setNewRule]     = useState<any>(EMPTY_NEW_RULE)
  const [creating, setCreating]   = useState(false)

  const { data: rulesData, loading: rulesLoading, error: rulesError, refetch: refetchRules } = useApiData<any>(() => api.coins.getRules(), [])
  const { data: earnersData, loading: earnersLoading, refetch: refetchEarners } = useApiData<any>(() => api.coins.getTopEarners(), [])
  const { data: statsData } = useApiData<any>(() => api.dashboard.getStats(), [])

  const rules: any[]   = rulesData?.rules || []
  const earners: any[] = earnersData?.earners || []
  const stats          = statsData

  const { mutate: updateRule, loading: updatingRule } = useMutation(
    (id: string, data: any) => api.coins.updateRule(id, data),
    { onSuccess: () => { setEditingId(null); refetchRules(); showToast('Rule updated ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: toggleRule } = useMutation(
    (id: string, isActive: boolean) => api.coins.updateRule(id, { isActive }),
    { onSuccess: () => refetchRules(), onError: (m) => showToast(m, 'error') }
  )

  const createRule = async (rule: any = newRule) => {
    if (!rule.action?.trim() || !rule.description?.trim()) { showToast('Action and description are required', 'error'); return }
    if (rule.coinsAwarded <= 0) { showToast('Coins must be > 0', 'error'); return }
    setCreating(true)
    try {
      await api.coins.createRule(rule)
      showToast('Rule created ✅')
      setShowCreate(false); setShowTemplates(false)
      setNewRule(EMPTY_NEW_RULE)
      refetchRules()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setCreating(false) }
  }

  const deleteRule = async (id: string, desc: string) => {
    if (!confirm(`Delete rule: "${desc}"?`)) return
    try { await api.coins.deleteRule(id); showToast('Deleted'); refetchRules() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const startEdit = (rule: any) => {
    setEditingId(rule.id)
    setEditVals({ coins: rule.coinsReward ?? rule.coins_awarded ?? 0, maxPerDay: rule.maxPerDay ?? rule.max_per_day ?? 1 })
  }

  // Check which known actions are already configured
  const configuredActions = new Set(rules.map((r: any) => r.action))
  const missingActions    = Object.keys(KNOWN_ACTIONS).filter(a => !configuredActions.has(a))

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coins & Rewards" subtitle="Configure what earns coins — changes take effect immediately in the app" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'🪙', label:'Total in Circulation', value:formatNumber(stats?.coinCirculation||0), color:'text-amber-700', bg:'bg-amber-50' },
            { emoji:'⚡', label:'Active Rules',          value:rules.filter((r:any)=>r.is_active).length, color:'text-green-700', bg:'bg-green-50' },
            { emoji:'📋', label:'Total Rules',            value:rules.length, color:'text-blue-700', bg:'bg-blue-50' },
            { emoji:'🏆', label:'Top Earners',            value:earners.length, color:'text-purple-700', bg:'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Exchange rate info */}
        <div className="card p-4 bg-amber-50/50 border border-amber-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">🪙</div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Coin Economy Settings</p>
              <p className="text-xs text-slate-500">Exchange rates and discount caps are managed in Settings</p>
            </div>
          </div>
          <a href="/settings" className="btn-secondary text-xs flex items-center gap-1.5"><Settings size={13}/> Open Settings</a>
        </div>

        {/* Missing actions banner */}
        {missingActions.length > 0 && (
          <div className="card p-4 bg-blue-50/50 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5"/>
              <div>
                <p className="font-semibold text-blue-900 text-sm">{missingActions.length} app action{missingActions.length>1?'s':''} not yet configured</p>
                <p className="text-xs text-blue-700 mt-0.5 mb-3">These actions exist in the mobile app but have no coin rule. Users won't earn coins for them until you add a rule.</p>
                <div className="flex flex-wrap gap-2">
                  {missingActions.slice(0,6).map(a => {
                    const meta = KNOWN_ACTIONS[a]
                    return (
                      <button key={a} onClick={() => {
                        setNewRule({ action:a, description:meta.label, coinsAwarded:meta.defaultCoins, maxPerDay:meta.defaultMaxPerDay })
                        setShowCreate(true); setShowTemplates(false)
                      }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-xl border border-blue-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-xs font-semibold text-blue-700">
                        <span>{meta.emoji}</span> {meta.label}
                        <span className="text-[10px] text-slate-400">+{meta.defaultCoins}🪙</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Earning Rules */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Earning Rules</h2>
              <div className="flex gap-2">
                <button onClick={refetchRules} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
                <button onClick={() => { setShowCreate(!showCreate); setShowTemplates(false) }} className="btn-primary text-sm">
                  <Plus size={13}/> Add Rule
                </button>
              </div>
            </div>

            {rulesLoading ? <PageLoader /> : rulesError ? <ErrorMessage message={rulesError} onRetry={refetchRules}/> : (
              <div className="space-y-2">
                {rules.map((rule: any) => {
                  const meta     = KNOWN_ACTIONS[rule.action]
                  const isEditing = editingId === rule.id
                  const coins    = rule.coinsReward ?? rule.coins_awarded ?? 0
                  const mpd      = rule.maxPerDay ?? rule.max_per_day ?? 1

                  return (
                    <div key={rule.id} className={`card p-4 transition-all ${!rule.is_active?'opacity-50':''}`}>
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
                          {meta?.emoji || '⚡'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-sm">{rule.description || meta?.label}</p>
                            <code className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">{rule.action}</code>
                          </div>
                          {meta?.desc && <p className="text-[11px] text-slate-400 mt-0.5">{meta.desc}</p>}
                        </div>

                        {/* Edit fields or values */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 mb-1">Coins</p>
                              <NumInput value={editVals.coins} onChange={(v:number)=>setEditVals(p=>({...p,coins:v}))} placeholder="5" className="w-16 text-center text-sm font-bold"/>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 mb-1">Max/Day</p>
                              <NumInput value={editVals.maxPerDay} onChange={(v:number)=>setEditVals(p=>({...p,maxPerDay:v}))} placeholder="1" className="w-16 text-center text-sm"/>
                              {editVals.maxPerDay===0&&<p className="text-[10px] text-blue-500 mt-0.5">∞ unlimited</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => updateRule(rule.id, { coinsAwarded:editVals.coins, maxPerDay:editVals.maxPerDay })}
                                disabled={!!updatingRule} className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center">
                                {updatingRule ? <Loader2 size={12} className="animate-spin text-green-700"/> : <Save size={12} className="text-green-700"/>}
                              </button>
                              <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={12} className="text-slate-600"/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Coins badge */}
                            <div className="text-center">
                              <span className="text-lg font-black text-amber-600">+{coins}</span>
                              <p className="text-[10px] text-slate-400">🪙 coins</p>
                            </div>
                            {/* Max/day */}
                            <div className="text-center">
                              <span className="text-sm font-bold text-slate-700">{mpd===0?'∞':mpd+'×'}</span>
                              <p className="text-[10px] text-slate-400">per day</p>
                            </div>
                            {/* Toggle */}
                            <button onClick={() => toggleRule(rule.id, !rule.is_active)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${rule.is_active?'bg-green-400':'bg-slate-300'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active?'translate-x-5':'translate-x-0.5'}`}/>
                            </button>
                            {/* Edit / Delete */}
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(rule)} className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center"><Edit size={12} className="text-amber-600"/></button>
                              <button onClick={() => deleteRule(rule.id, rule.description)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12} className="text-red-500"/></button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 7-day activity */}
                      {rule.coinsLast7d > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400">
                          <TrendingUp size={11} className="text-green-500"/>
                          {formatNumber(parseInt(rule.coinsLast7d||0))} coins awarded last 7 days
                        </div>
                      )}
                    </div>
                  )
                })}

                {rules.length === 0 && !rulesLoading && (
                  <div className="card p-12 text-center">
                    <Coins size={32} className="mx-auto mb-3 text-slate-200"/>
                    <p className="font-bold text-slate-600 mb-1">No earning rules yet</p>
                    <p className="text-xs text-slate-400 mb-4">Add rules to let students earn coins for actions</p>
                    <button onClick={() => setShowTemplates(true)} className="btn-primary mx-auto text-sm">Use Templates →</button>
                  </div>
                )}
              </div>
            )}

            {/* Create new rule form */}
            {showCreate && (
              <div className="card p-5 border-2 border-brand-200 bg-brand-50/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Plus size={15} className="text-brand-600"/> New Earning Rule</h3>
                  <button onClick={() => { setShowCreate(false); setShowTemplates(false) }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={13}/></button>
                </div>

                {/* Template picker */}
                {!newRule.action && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Quick templates</p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {Object.entries(KNOWN_ACTIONS).filter(([a])=>!configuredActions.has(a)).map(([a, meta]) => (
                        <button key={a} onClick={() => setNewRule({ action:a, description:meta.label, coinsAwarded:meta.defaultCoins, maxPerDay:meta.defaultMaxPerDay })}
                          className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-all text-left">
                          <span className="text-lg shrink-0">{meta.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{meta.label}</p>
                            <p className="text-[10px] text-slate-400">+{meta.defaultCoins}🪙</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Or fill in custom action below ↓</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Action Key * <span className="font-normal text-slate-400">(snake_case)</span></label>
                    <input value={newRule.action} onChange={e => setNewRule((r: any) => ({...r, action:e.target.value.toLowerCase().replace(/\s+/g,'_')}))}
                      className="input font-mono text-sm" placeholder="e.g. daily_quiz"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Display Name *</label>
                    <input value={newRule.description} onChange={e => setNewRule((r: any) => ({...r, description:e.target.value}))}
                      className="input" placeholder="e.g. Complete Daily Quiz"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins Awarded</label>
                    <NumInput value={newRule.coinsAwarded} onChange={(v: number) => setNewRule((r: any)=>({...r,coinsAwarded:v}))} placeholder="5" min={1}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Per Day</label>
                    <NumInput value={newRule.maxPerDay} onChange={(v: number) => setNewRule((r: any)=>({...r,maxPerDay:v}))} placeholder="1 (0 = unlimited)"/>
                    {newRule.maxPerDay===0&&<p className="text-[10px] text-blue-500 mt-1">0 = unlimited per day</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => createRule(newRule)} disabled={creating||!newRule.action.trim()||!newRule.description.trim()} className="btn-primary text-sm disabled:opacity-40">
                    {creating?<><Loader2 size={13} className="animate-spin"/> Creating…</>:'Create Rule'}
                  </button>
                  <button onClick={() => { setShowCreate(false); setNewRule(EMPTY_NEW_RULE) }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Top Earners */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Top Earners</h2>
              <button onClick={refetchEarners} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
            </div>
            <div className="card p-4">
              {earnersLoading ? <PageLoader /> : (
                <div className="space-y-3">
                  {earners.slice(0,10).map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-black text-center shrink-0">
                        {i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-black shrink-0">
                        {u.name?.split(' ').map((n: string)=>n[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.primary_exam||'—'}</p>
                      </div>
                      <span className="badge bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                        🪙 {formatNumber(u.currentBalance??u.coins??0)}
                      </span>
                    </div>
                  ))}
                  {earners.length===0&&<p className="text-center text-slate-400 text-sm py-4">No data yet</p>}
                </div>
              )}
            </div>

            {/* Per-action daily rates summary */}
            <div className="card p-4 mt-4">
              <p className="font-bold text-slate-900 text-sm mb-3">📊 Earnings Potential</p>
              <div className="space-y-1.5">
                {rules.filter((r:any)=>r.is_active).slice(0,6).map((r:any) => {
                  const coins = r.coinsReward??r.coins_awarded??0
                  const mpd   = r.maxPerDay??r.max_per_day??1
                  const max   = mpd===0?'∞':`${coins*mpd}`
                  return (
                    <div key={r.id} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 truncate flex-1">{KNOWN_ACTIONS[r.action]?.emoji||'⚡'} {r.description}</span>
                      <span className="text-xs font-bold text-amber-600 shrink-0 ml-2">+{max}🪙/day</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">
                  Max daily: <span className="font-black text-slate-800">
                    🪙 {rules.filter((r:any)=>r.is_active).reduce((a:number,r:any) => {
                      const c=r.coinsReward??r.coins_awarded??0
                      const m=r.maxPerDay??r.max_per_day??1
                      return m===0?a:a+(c*m)
                    },0)}
                  </span> per student
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}