'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import {
  Edit, Save, X, RefreshCw, TrendingUp, Plus, Trash2,
  Coins, Loader2, Info, Lock, Power, Percent, Gift,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

// Number input — empty-friendly, supports decimals via `step`
function NumInput({ value, onChange, placeholder='', min=0, max, step, className='' }: any) {
  const isDecimal = !!step && step !== 1 && String(step).includes('.')
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value === 0 ? '' : String(value)) }, [value])
  return (
    <input type="number" className={`input ${className}`} value={raw} placeholder={placeholder}
      min={min} max={max} step={step ?? 1}
      onChange={e => {
        setRaw(e.target.value)
        const n = isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value)
        if (!isNaN(n)) onChange(n)
      }}
      onBlur={() => { if (!raw.trim() || isNaN(Number(raw))) { setRaw(''); onChange(0) } }} />
  )
}

// Display metadata for coin_rules categories — order controls section order.
// Falls back to a generic "Other" group for any category not listed here.
const CATEGORY_META: Record<string, { label: string; blurb: string; order: number }> = {
  quizzes:       { label: 'Quizzes',                 blurb: 'Coins for completing daily, mock and topic quizzes', order: 1 },
  study:         { label: 'Study & Focus',           blurb: 'Coins for study room sessions and focused study time', order: 2 },
  content:       { label: 'Content Uploads',         blurb: 'Coins for contributing study material', order: 3 },
  social:        { label: 'Referrals & Social',      blurb: 'Coins for inviting friends and their progress', order: 4 },
  engagement:    { label: 'Engagement',              blurb: 'Coins for everyday app engagement', order: 5 },
  achievements:  { label: 'Achievements & Challenges', blurb: 'Coins for unlocking achievements and weekly challenges', order: 6 },
  streaks:       { label: 'Streaks & Leaderboard',   blurb: 'Coins for streak milestones and leaderboard placements', order: 7 },
  targets:       { label: 'Daily Targets',           blurb: 'Coins for completing self-set daily study targets', order: 8 },
  ads:           { label: 'Rewarded Ads',            blurb: 'Coins for watching rewarded video ads', order: 9 },
  subscriptions: { label: 'Subscriptions',           blurb: 'Bonus coins tied to subscription plans', order: 10 },
  custom:        { label: 'Custom Rules',            blurb: 'Extra rules you\u2019ve added yourself', order: 11 },
  legacy:        { label: 'Legacy (unused)',         blurb: 'Old action keys nothing in the app triggers anymore', order: 12 },
}
const categoryMeta = (cat: string) => CATEGORY_META[cat] || { label: cat.charAt(0).toUpperCase()+cat.slice(1), blurb: '', order: 99 }

const DAY_LABELS = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7']
const EMPTY_NEW_RULE = { action:'', description:'', coinsAwarded:5, maxPerDay:1, category:'custom', icon:'⚡', unitLabel:'' }
const DEFAULT_ECONOMY = { enabled:true, coinToInrRate:1, maxCoinsPerPurchase:50, maxCoinDiscountPctSubscription:30, adMinPerSession:2, checkInRewards:[5,5,10,10,15,15,25] }

export default function CoinsPage() {
  const { showToast, ToastComponent } = useToast()
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editVals, setEditVals]   = useState({ coins:0, maxPerDay:1, description:'' })
  const [showCreate, setShowCreate] = useState(false)
  const [newRule, setNewRule]     = useState<any>(EMPTY_NEW_RULE)
  const [creating, setCreating]   = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)

  const { data: rulesData, loading: rulesLoading, error: rulesError, refetch: refetchRules } = useApiData<any>(() => api.coins.getRules(), [])
  const { data: earnersData, loading: earnersLoading, refetch: refetchEarners } = useApiData<any>(() => api.coins.getTopEarners(), [])
  const { data: statsData, refetch: refetchStats } = useApiData<any>(() => api.coins.getStats(), [])
  const { data: economyData, refetch: refetchEconomy } = useApiData<any>(() => api.coins.getEconomy(), [])

  const rules: any[]   = rulesData?.rules || []
  const earners: any[] = earnersData?.earners || []
  const stats          = statsData?.stats

  // ── Economy settings form — synced from the server, saved as a batch ──
  const [econForm, setEconForm] = useState<any>(DEFAULT_ECONOMY)
  const [econDirty, setEconDirty] = useState(false)
  useEffect(() => {
    const e = economyData?.economy
    if (e) setEconForm({ ...DEFAULT_ECONOMY, ...e, checkInRewards: e.checkInRewards?.length === 7 ? e.checkInRewards : DEFAULT_ECONOMY.checkInRewards })
  }, [economyData])

  const refetchAll = () => { refetchRules(); refetchEconomy(); refetchStats() }

  const { mutate: saveEconomy, loading: savingEconomy } = useMutation(
    (data: any) => api.coins.updateEconomy(data),
    { onSuccess: () => { setEconDirty(false); refetchAll(); showToast('Economy settings saved ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: toggleSystem, loading: togglingSystem } = useMutation(
    (enabled: boolean) => api.coins.updateEconomy({ enabled }),
    { onSuccess: () => { refetchAll(); }, onError: (msg) => showToast(msg, 'error') }
  )

  const { mutate: updateRule, loading: updatingRule } = useMutation(
    (id: string, data: any) => api.coins.updateRule(id, data),
    { onSuccess: () => { setEditingId(null); refetchRules(); showToast('Rule updated ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: toggleRule } = useMutation(
    (id: string, isActive: boolean) => api.coins.updateRule(id, { isActive }),
    { onSuccess: () => refetchRules(), onError: (m) => showToast(m, 'error') }
  )

  const createRule = async () => {
    const rule = newRule
    if (!rule.action?.trim() || !rule.description?.trim()) { showToast('Action key and display name are required', 'error'); return }
    if (rule.coinsAwarded < 0) { showToast('Coins can\u2019t be negative', 'error'); return }
    setCreating(true)
    try {
      await api.coins.createRule(rule)
      showToast('Rule created ✅')
      setShowCreate(false)
      setNewRule(EMPTY_NEW_RULE)
      refetchRules()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
    finally { setCreating(false) }
  }

  const deleteRule = async (rule: any) => {
    if (rule.is_core) { showToast('Built-in actions can\u2019t be deleted \u2014 use the toggle to turn them off instead.', 'error'); return }
    if (!confirm(`Delete rule: "${rule.description}"?`)) return
    try { await api.coins.deleteRule(rule.id); showToast('Deleted'); refetchRules() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const startEdit = (rule: any) => {
    setEditingId(rule.id)
    setEditVals({ coins: rule.coins_awarded ?? 0, maxPerDay: rule.max_per_day ?? 1, description: rule.description ?? '' })
  }

  // Total coins a student could earn in a single day if every active rule
  // fired its maximum number of times. max_per_day=0 means unlimited and
  // is excluded from this ceiling.
  const maxDailyEarnings = rules
    .filter((r: any) => r.is_active)
    .reduce((total: number, r: any) => {
      const coins = r.coins_awarded ?? 0
      const mpd   = r.max_per_day ?? 1
      return mpd === 0 ? total : total + coins * mpd
    }, 0)

  // Group rules by category for display
  const grouped: Record<string, any[]> = {}
  for (const r of rules) {
    const cat = r.category || 'custom'
    ;(grouped[cat] ||= []).push(r)
  }
  const categoryOrder = Object.keys(grouped).sort((a, b) => categoryMeta(a).order - categoryMeta(b).order)
  const legacyKey = categoryOrder.find(c => c === 'legacy')
  const visibleCategories = categoryOrder.filter(c => c !== 'legacy')

  const systemEnabled = econForm.enabled !== false

  const setCheckInDay = (i: number, v: number) => {
    setEconForm((p: any) => {
      const arr = [...(p.checkInRewards || DEFAULT_ECONOMY.checkInRewards)]
      arr[i] = v
      return { ...p, checkInRewards: arr }
    })
    setEconDirty(true)
  }

  const renderRuleCard = (rule: any) => {
    const isEditing = editingId === rule.id
    const coins = rule.coins_awarded ?? 0
    const mpd   = rule.max_per_day ?? 1

    return (
      <div key={rule.id} className={`card p-4 transition-all ${!rule.is_active ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
            {rule.icon || '⚡'}
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input value={editVals.description} onChange={e => setEditVals(p => ({ ...p, description: e.target.value }))}
                className="input text-sm font-bold py-1 px-2 mb-1 w-full" placeholder="Display name" />
            ) : (
              <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                {rule.description}
                {rule.is_core && <Lock size={11} className="text-slate-300" />}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {rule.unit_label || 'Custom action'}
              <code className="ml-2 text-slate-300 font-mono">{rule.action}</code>
            </p>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">Coins</p>
                <NumInput value={editVals.coins} onChange={(v:number)=>setEditVals(p=>({...p,coins:v}))} placeholder="5" className="w-16 text-center text-sm font-bold"/>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">Max/Day</p>
                <NumInput value={editVals.maxPerDay} onChange={(v:number)=>setEditVals(p=>({...p,maxPerDay:v}))} placeholder="1" className="w-16 text-center text-sm"/>
                {editVals.maxPerDay===0 && <p className="text-[10px] text-blue-500 mt-0.5">∞ unlimited</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => updateRule(rule.id, { coinsAwarded:editVals.coins, maxPerDay:editVals.maxPerDay, description:editVals.description })}
                  disabled={!!updatingRule} className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center">
                  {updatingRule ? <Loader2 size={12} className="animate-spin text-green-700"/> : <Save size={12} className="text-green-700"/>}
                </button>
                <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={12} className="text-slate-600"/></button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <span className="text-lg font-black text-amber-600">+{coins}</span>
                <p className="text-[10px] text-slate-400">🪙 coins</p>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-slate-700">{mpd===0?'∞':mpd+'×'}</span>
                <p className="text-[10px] text-slate-400">per day</p>
              </div>
              <div className="text-center min-w-[3rem]">
                <span className="text-sm font-bold text-slate-700">{mpd===0?'∞':`🪙 ${coins*mpd}`}</span>
                <p className="text-[10px] text-slate-400">daily cap</p>
              </div>
              <button onClick={() => toggleRule(rule.id, !rule.is_active)}
                className={`relative w-10 h-5 rounded-full transition-colors ${rule.is_active?'bg-green-400':'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active?'translate-x-5':'translate-x-0.5'}`}/>
              </button>
              <div className="flex gap-1">
                <button onClick={() => startEdit(rule)} className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center"><Edit size={12} className="text-amber-600"/></button>
                <button onClick={() => deleteRule(rule)}
                  title={rule.is_core ? 'Built-in \u2014 turn off instead of deleting' : 'Delete rule'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${rule.is_core ? 'bg-slate-50 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100'}`}>
                  <Trash2 size={12} className={rule.is_core ? 'text-slate-300' : 'text-red-500'}/>
                </button>
              </div>
            </div>
          )}
        </div>

        {rule.coins_7d > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp size={11} className="text-green-500"/>
            {formatNumber(parseInt(rule.coins_7d||0))} coins awarded last 7 days
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coins & Rewards" subtitle="The one place for the whole coin economy — changes take effect immediately in the app" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* Master switch */}
        <div className={`card p-4 flex items-center justify-between gap-4 flex-wrap ${systemEnabled ? '' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${systemEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Power size={20}/>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Coin economy is {systemEnabled ? 'ON' : 'OFF'}</p>
              <p className="text-xs text-slate-500 max-w-md">
                {systemEnabled
                  ? 'Students are earning and spending coins normally across the app.'
                  : 'Master switch is off \u2014 no coins are being earned or spent anywhere in the app right now (wallet, quizzes, purchases, everything).'}
              </p>
            </div>
          </div>
          <button onClick={() => toggleSystem(!systemEnabled)} disabled={togglingSystem}
            className={`relative w-14 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${systemEnabled ? 'bg-green-400' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${systemEnabled ? 'translate-x-7' : 'translate-x-1'}`}/>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3 bg-amber-50">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="text-xl font-black text-amber-700">{formatNumber(stats?.total_circulating||0)}</p>
              <p className="text-xs text-slate-500 font-medium">Coins in circulation</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 bg-blue-50">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-xl font-black text-blue-700">{formatNumber(stats?.earned_this_week||0)}</p>
              <p className="text-xs text-slate-500 font-medium">Earned this week</p>
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
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-xl font-black text-purple-700">{maxDailyEarnings>0?`🪙 ${formatNumber(maxDailyEarnings)}`:'—'}</p>
              <p className="text-xs text-slate-500 font-medium">Max a student can earn / day</p>
            </div>
          </div>
        </div>

        {/* Economy settings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-brand-500"/>
              <h2 className="font-bold text-slate-900 text-sm">Economy Settings</h2>
            </div>
            <button onClick={() => saveEconomy({
                coinToInrRate: econForm.coinToInrRate,
                maxCoinsPerPurchase: econForm.maxCoinsPerPurchase,
                maxCoinDiscountPctSubscription: econForm.maxCoinDiscountPctSubscription,
                adMinPerSession: econForm.adMinPerSession,
                checkInRewards: econForm.checkInRewards,
              })}
              disabled={savingEconomy || !econDirty}
              className="btn-primary text-sm disabled:opacity-40">
              {savingEconomy ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} Save Economy Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">1 Coin = ₹</label>
              <NumInput value={econForm.coinToInrRate} step={0.01} min={0}
                onChange={(v:number)=>{setEconForm((p:any)=>({...p,coinToInrRate:v})); setEconDirty(true)}} placeholder="1" className="font-bold"/>
              <p className="text-[11px] text-slate-400 mt-1">Used to convert coins into a ₹ discount on purchases</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max coins per purchase</label>
              <NumInput value={econForm.maxCoinsPerPurchase} min={0}
                onChange={(v:number)=>{setEconForm((p:any)=>({...p,maxCoinsPerPurchase:v})); setEconDirty(true)}} placeholder="50" className="font-bold"/>
              <p className="text-[11px] text-slate-400 mt-1">Default cap on coins redeemable per course/material order</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max coin discount — subscriptions</label>
              <div className="relative">
                <NumInput value={econForm.maxCoinDiscountPctSubscription} min={0} max={100}
                  onChange={(v:number)=>{setEconForm((p:any)=>({...p,maxCoinDiscountPctSubscription:v})); setEconDirty(true)}} placeholder="30" className="font-bold pr-7"/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Max share of a subscription price payable with coins</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min rewarded ads / session</label>
              <NumInput value={econForm.adMinPerSession} min={0}
                onChange={(v:number)=>{setEconForm((p:any)=>({...p,adMinPerSession:v})); setEconDirty(true)}} placeholder="2" className="font-bold"/>
              <p className="text-[11px] text-slate-400 mt-1">Coins-per-ad is the &ldquo;Watch Rewarded Ad&rdquo; rule below</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-amber-500"/>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Daily check-in reward ladder</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAY_LABELS.map((label, i) => (
                <div key={label} className={`text-center ${i===6 ? 'ring-1 ring-amber-200 rounded-xl p-1 -m-1 bg-amber-50/60' : ''}`}>
                  <p className="text-[10px] text-slate-400 mb-1">{label}{i===6 && ' 🎁'}</p>
                  <NumInput value={(econForm.checkInRewards||DEFAULT_ECONOMY.checkInRewards)[i]} min={0}
                    onChange={(v:number)=>setCheckInDay(i, v)} className="text-center text-sm font-bold"/>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Streak resets to Day 1 if a student misses a day. Day 7 is the weekly bonus.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Earning Rules */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Earning Rules</h2>
              <div className="flex gap-2">
                <button onClick={refetchRules} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
                  <Plus size={13}/> Add Custom Rule
                </button>
              </div>
            </div>

            {/* Create new rule form */}
            {showCreate && (
              <div className="card p-5 border-2 border-brand-200 bg-brand-50/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Plus size={15} className="text-brand-600"/> New Custom Rule</h3>
                  <button onClick={() => { setShowCreate(false); setNewRule(EMPTY_NEW_RULE) }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={13}/></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Action Key * <span className="font-normal text-slate-400">(snake_case)</span></label>
                    <input value={newRule.action} onChange={e => setNewRule((r: any) => ({...r, action:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'_')}))}
                      className="input font-mono text-sm" placeholder="e.g. festive_bonus"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Display Name *</label>
                    <input value={newRule.description} onChange={e => setNewRule((r: any) => ({...r, description:e.target.value}))}
                      className="input" placeholder="e.g. Festive Bonus"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins Awarded</label>
                    <NumInput value={newRule.coinsAwarded} onChange={(v: number) => setNewRule((r: any)=>({...r,coinsAwarded:v}))} placeholder="5" min={0}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Per Day</label>
                    <NumInput value={newRule.maxPerDay} onChange={(v: number) => setNewRule((r: any)=>({...r,maxPerDay:v}))} placeholder="1 (0 = unlimited)"/>
                    {newRule.maxPerDay===0 && <p className="text-[10px] text-blue-500 mt-1">0 = unlimited per day</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Icon</label>
                    <input value={newRule.icon} onChange={e => setNewRule((r: any) => ({...r, icon:e.target.value}))}
                      className="input text-center" maxLength={2} placeholder="⚡"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
                    <select value={newRule.category} onChange={e => setNewRule((r:any)=>({...r, category:e.target.value}))} className="input">
                      {Object.entries(CATEGORY_META).filter(([k])=>k!=='legacy').map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Note <span className="font-normal text-slate-400">(shown to you, not students)</span></label>
                    <input value={newRule.unitLabel} onChange={e => setNewRule((r: any) => ({...r, unitLabel:e.target.value}))}
                      className="input text-sm" placeholder="e.g. One-off promo during Diwali week"/>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={createRule} disabled={creating||!newRule.action.trim()||!newRule.description.trim()} className="btn-primary text-sm disabled:opacity-40">
                    {creating?<><Loader2 size={13} className="animate-spin"/> Creating…</>:'Create Rule'}
                  </button>
                  <button onClick={() => { setShowCreate(false); setNewRule(EMPTY_NEW_RULE) }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            {rulesLoading ? <PageLoader /> : rulesError ? <ErrorMessage message={rulesError} onRetry={refetchRules}/> : (
              <>
                {visibleCategories.map(cat => {
                  const meta = categoryMeta(cat)
                  return (
                    <div key={cat} className="space-y-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">{meta.label}</h3>
                        {meta.blurb && <p className="text-[11px] text-slate-400">{meta.blurb}</p>}
                      </div>
                      {grouped[cat].map(renderRuleCard)}
                    </div>
                  )
                })}

                {rules.length === 0 && (
                  <div className="card p-12 text-center">
                    <Coins size={32} className="mx-auto mb-3 text-slate-200"/>
                    <p className="font-bold text-slate-600 mb-1">No earning rules yet</p>
                    <p className="text-xs text-slate-400">Run the latest backend migration to seed the default rules</p>
                  </div>
                )}

                {legacyKey && grouped[legacyKey]?.length > 0 && (
                  <div className="space-y-2">
                    <button onClick={() => setShowLegacy(s => !s)} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600">
                      <Info size={12}/> {categoryMeta(legacyKey).label} ({grouped[legacyKey].length}) {showLegacy ? '\u2212' : '+'}
                    </button>
                    {showLegacy && (
                      <>
                        <p className="text-[11px] text-slate-400">{categoryMeta(legacyKey).blurb}</p>
                        {grouped[legacyKey].map(renderRuleCard)}
                      </>
                    )}
                  </div>
                )}
              </>
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
