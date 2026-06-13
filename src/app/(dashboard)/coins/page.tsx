'use client'
import { useState, useEffect } from 'react'
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
  const [showSettings, setShowSettings] = useState(false)
  const [newRule, setNewRule]     = useState<any>(EMPTY_NEW_RULE)
  const [creating, setCreating]   = useState(false)

  const { data: rulesData, loading: rulesLoading, error: rulesError, refetch: refetchRules } = useApiData<any>(() => api.coins.getRules(), [])
  const { data: earnersData, loading: earnersLoading, refetch: refetchEarners } = useApiData<any>(() => api.coins.getTopEarners(), [])
  const { data: statsData } = useApiData<any>(() => api.dashboard.getStats(), [])
  const { data: adConfigData, refetch: refetchAdConfig } = useApiData<any>(() => api.coins.getAdConfig(), [])

  const [adForm, setAdForm] = useState({ coinsPerAd: 10, minAdsPerSession: 2 })
  const [adSaving, setAdSaving] = useState(false)
  useEffect(() => {
    if (adConfigData?.coinsPerAd !== undefined) {
      setAdForm({ coinsPerAd: adConfigData.coinsPerAd, minAdsPerSession: adConfigData.minAdsPerSession ?? 2 })
    }
  }, [adConfigData])

  const saveAdConfig = async () => {
    setAdSaving(true)
    try {
      await api.coins.updateAdConfig(adForm)
      showToast('Ad reward settings saved ✅')
      refetchAdConfig()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setAdSaving(false) }
  }


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

  // Total coins a student could earn in a single day if they completed
  // every active rule its maximum number of times. Rules with maxPerDay=0
  // (unlimited) are excluded from this ceiling since they have no cap.
  const maxDailyEarnings = rules
    .filter((r: any) => r.is_active)
    .reduce((total: number, r: any) => {
      const coins = r.coinsReward ?? r.coins_awarded ?? 0
      const mpd   = r.maxPerDay ?? r.max_per_day ?? 1
      return mpd === 0 ? total : total + coins * mpd
    }, 0)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coins & Rewards" subtitle="Configure what earns coins — changes take effect immediately in the app" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* Missing actions — the most actionable item, shown first */}
        {missingActions.length > 0 && (
          <div className="card p-4 bg-blue-50/50 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 text-sm">{missingActions.length} app action{missingActions.length>1?'s':''} not set up yet</p>
                <p className="text-xs text-blue-700 mt-0.5 mb-3">Students already do these things in the app, but won't earn coins for them until you add a rule. Tap one to set it up with suggested values.</p>
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

        {/* Stats — three numbers that matter: what exists, what's live, what it costs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3 bg-amber-50">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="text-xl font-black text-amber-700">{formatNumber(stats?.coinCirculation||0)}</p>
              <p className="text-xs text-slate-500 font-medium">Total coins in circulation</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 bg-green-50">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-xl font-black text-green-700">{rules.filter((r:any)=>r.is_active).length} <span className="text-sm font-bold text-green-600">/ {rules.length}</span></p>
              <p className="text-xs text-slate-500 font-medium">Rules active</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 bg-purple-50">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-xl font-black text-purple-700">{maxDailyEarnings>0?`🪙 ${formatNumber(maxDailyEarnings)}`:'—'}</p>
              <p className="text-xs text-slate-500 font-medium">Max a student can earn per day</p>
            </div>
          </div>
        </div>

        {/* Settings — collapsed by default, two things that affect the coin economy globally */}
        <div className="card overflow-hidden">
          <button onClick={() => setShowSettings(s => !s)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0">⚙️</div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-sm">Coin economy settings</p>
                <p className="text-xs text-slate-400">Rewarded ad payouts, exchange rates, and spending caps</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`text-slate-400 shrink-0 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showSettings && (
            <div className="border-t border-slate-100 p-4 space-y-4">
              {/* Rewarded Ad Settings */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-lg shrink-0">📺</div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Rewarded ads</p>
                    <p className="text-xs text-slate-400">What students earn for watching an ad, and how many they must watch per study session</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Coins per ad</p>
                    <NumInput value={adForm.coinsPerAd} onChange={(v:number)=>setAdForm(p=>({...p,coinsPerAd:v}))} placeholder="10" className="w-16 text-center text-sm font-bold" min={1}/>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 mb-1">Required per session</p>
                    <NumInput value={adForm.minAdsPerSession} onChange={(v:number)=>setAdForm(p=>({...p,minAdsPerSession:v}))} placeholder="2" className="w-16 text-center text-sm font-bold" min={0}/>
                  </div>
                  <button onClick={saveAdConfig} disabled={adSaving} className="btn-primary text-sm disabled:opacity-40">
                    {adSaving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} Save
                  </button>
                </div>
              </div>

              {/* Coin Economy link */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-lg shrink-0">🪙</div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Coin value &amp; spending caps</p>
                    <p className="text-xs text-slate-400">How many coins equal ₹1, and how much of a purchase can be paid with coins</p>
                  </div>
                </div>
                <a href="/settings" className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"><Settings size={13}/> Open Settings</a>
              </div>
            </div>
          )}
        </div>


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
                          <p className="font-bold text-slate-900 text-sm">{rule.description || meta?.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {meta?.desc || 'Custom action'}
                            <code className="ml-2 text-slate-300 font-mono">{rule.action}</code>
                          </p>
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
                            {/* Daily max — the actually-useful number */}
                            <div className="text-center min-w-[3rem]">
                              <span className="text-sm font-bold text-slate-700">{mpd===0?'∞':`🪙 ${coins*mpd}`}</span>
                              <p className="text-[10px] text-slate-400">daily cap</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}