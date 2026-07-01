'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import {
  Edit, Save, X, RefreshCw, TrendingUp, Plus, Trash2,
  Coins, Loader2, Info, Lock, Power, Percent, Gift, ShoppingBag,
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

const CATEGORY_META: Record<string, { label: string; blurb: string; order: number }> = {
  quizzes:       { label: 'Quizzes',                   blurb: 'Coins for completing daily, mock and topic quizzes', order: 1 },
  study:         { label: 'Study & Focus',             blurb: 'Coins for study room sessions and focused study time', order: 2 },
  content:       { label: 'Content Uploads',           blurb: 'Coins for contributing study material', order: 3 },
  social:        { label: 'Referrals & Social',        blurb: 'Coins for inviting friends and their progress', order: 4 },
  engagement:    { label: 'Engagement',                blurb: 'Coins for everyday app engagement', order: 5 },
  achievements:  { label: 'Achievements & Challenges', blurb: 'Coins for unlocking achievements and weekly challenges', order: 6 },
  streaks:       { label: 'Streaks & Leaderboard',     blurb: 'Coins for streak milestones and leaderboard placements', order: 7 },
  targets:       { label: 'Daily Targets',             blurb: 'Coins for completing self-set daily study targets', order: 8 },
  ads:           { label: 'Rewarded Ads',              blurb: 'Coins for watching rewarded video ads', order: 9 },
  subscriptions: { label: 'Subscriptions',             blurb: 'Bonus coins tied to subscription plans', order: 10 },
  custom:        { label: 'Custom Rules',              blurb: 'Extra rules you’ve added yourself', order: 11 },
  legacy:        { label: 'Legacy (unused)',           blurb: 'Old action keys nothing in the app triggers anymore', order: 12 },
}
const categoryMeta = (cat: string) => CATEGORY_META[cat] || { label: cat.charAt(0).toUpperCase()+cat.slice(1), blurb: '', order: 99 }

const DAY_LABELS = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7']
const EMPTY_NEW_RULE = { action:'', description:'', coinsAwarded:5, maxPerDay:1, category:'custom', icon:'⚡', unitLabel:'' }
const DEFAULT_ECONOMY = { enabled:true, coinToInrRate:1, maxCoinDiscountPctCourse:10, maxCoinDiscountPctSubscription:30, adMinPerSession:2, checkInRewards:[5,5,10,10,15,15,25] }

const ITEM_TYPES = ['badge','discount','unlock','physical','digital','subscription']
const EMPTY_ITEM = { title:'', description:'', coinCost:100, itemType:'badge', itemValue:'', stock:'', sortOrder:0, isActive:true }
const TYPE_EMOJI: Record<string, string> = { badge:'🏅', discount:'💳', unlock:'🔓', physical:'📦', digital:'💾', subscription:'⭐' }

export default function CoinsPage() {
  const { showToast, ToastComponent } = useToast()
  const [tab, setTab] = useState<'rules'|'store'>('rules')

  // ── Rules tab state ─────────────────────────────────────────
  const [editingId, setEditingId]     = useState<string|null>(null)
  const [editVals, setEditVals]       = useState({ coins:0, maxPerDay:1, description:'' })
  const [showCreate, setShowCreate]   = useState(false)
  const [newRule, setNewRule]         = useState<any>(EMPTY_NEW_RULE)
  const [creating, setCreating]       = useState(false)
  const [showLegacy, setShowLegacy]   = useState(false)

  const { data: rulesData, loading: rulesLoading, error: rulesError, refetch: refetchRules } = useApiData<any>(() => api.coins.getRules(), [])
  const { data: earnersData, loading: earnersLoading, refetch: refetchEarners }               = useApiData<any>(() => api.coins.getTopEarners(), [])
  const { data: statsData,   refetch: refetchStats }                                           = useApiData<any>(() => api.coins.getStats(), [])
  const { data: economyData, refetch: refetchEconomy }                                         = useApiData<any>(() => api.coins.getEconomy(), [])

  const rules: any[]   = rulesData?.rules || []
  const earners: any[] = earnersData?.earners || []
  const stats          = statsData?.stats

  const [econForm, setEconForm]   = useState<any>(DEFAULT_ECONOMY)
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
    if (rule.coinsAwarded < 0) { showToast('Coins can’t be negative', 'error'); return }
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
    if (rule.is_core) { showToast('Built-in actions can’t be deleted — use the toggle to turn them off instead.', 'error'); return }
    if (!confirm(`Delete rule: "${rule.description}"?`)) return
    try { await api.coins.deleteRule(rule.id); showToast('Deleted'); refetchRules() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const startEdit = (rule: any) => {
    setEditingId(rule.id)
    setEditVals({ coins: rule.coins_awarded ?? 0, maxPerDay: rule.max_per_day ?? 1, description: rule.description ?? '' })
  }

  const maxDailyEarnings = rules
    .filter((r: any) => r.is_active)
    .reduce((total: number, r: any) => {
      const coins = r.coins_awarded ?? 0
      const mpd   = r.max_per_day ?? 1
      return mpd === 0 ? total : total + coins * mpd
    }, 0)

  const grouped: Record<string, any[]> = {}
  for (const r of rules) {
    const cat = r.category || 'custom'
    ;(grouped[cat] ||= []).push(r)
  }
  const categoryOrder      = Object.keys(grouped).sort((a, b) => categoryMeta(a).order - categoryMeta(b).order)
  const legacyKey          = categoryOrder.find(c => c === 'legacy')
  const visibleCategories  = categoryOrder.filter(c => c !== 'legacy')
  const systemEnabled      = econForm.enabled !== false

  const setCheckInDay = (i: number, v: number) => {
    setEconForm((p: any) => {
      const arr = [...(p.checkInRewards || DEFAULT_ECONOMY.checkInRewards)]
      arr[i] = v
      return { ...p, checkInRewards: arr }
    })
    setEconDirty(true)
  }

  // ── Store tab state ─────────────────────────────────────────
  const { data: storeData, loading: storeLoading, error: storeError, refetch: refetchStore } = useApiData<any>(() => api.coins.getStoreItems(), [tab === 'store'])
  const { data: redemptionsData, loading: redemptionsLoading, refetch: refetchRedemptions }    = useApiData<any>(() => api.coins.getRedemptions(), [tab === 'store'])

  const storeItems: any[]    = storeData?.items || []
  const redemptions: any[]   = redemptionsData?.redemptions || []

  const [editingItem, setEditingItem]   = useState<string|null>(null)
  const [itemForm, setItemForm]         = useState<any>(EMPTY_ITEM)
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [creatingItem, setCreatingItem] = useState(false)

  const openEditItem = (item: any) => {
    setEditingItem(item.id)
    setItemForm({
      title:       item.title,
      description: item.description ?? '',
      coinCost:    item.coin_cost,
      itemType:    item.item_type,
      itemValue:   item.item_value ?? '',
      stock:       item.stock !== null && item.stock !== undefined ? String(item.stock) : '',
      sortOrder:   item.sort_order ?? 0,
      isActive:    item.is_active !== false,
    })
  }

  const saveItem = async (id?: string) => {
    const form = itemForm
    if (!form.title?.trim()) { showToast('Title is required', 'error'); return }
    if (!form.coinCost || form.coinCost <= 0) { showToast('Coin cost must be > 0', 'error'); return }
    const payload = {
      title:       form.title.trim(),
      description: form.description?.trim() || null,
      coinCost:    +form.coinCost,
      itemType:    form.itemType || 'badge',
      itemValue:   form.itemValue?.trim() || null,
      stock:       form.stock === '' || form.stock === null ? null : +form.stock,
      sortOrder:   +form.sortOrder || 0,
      isActive:    form.isActive,
    }
    if (id) {
      setCreatingItem(true)
      try { await api.coins.updateStoreItem(id, payload); showToast('Item updated ✅'); setEditingItem(null); refetchStore() }
      catch (e: any) { showToast(e.message || 'Failed', 'error') }
      finally { setCreatingItem(false) }
    } else {
      setCreatingItem(true)
      try { await api.coins.createStoreItem(payload); showToast('Item created ✅'); setShowCreateItem(false); setItemForm(EMPTY_ITEM); refetchStore() }
      catch (e: any) { showToast(e.message || 'Failed', 'error') }
      finally { setCreatingItem(false) }
    }
  }

  const deleteItem = async (item: any) => {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return
    try { await api.coins.deleteStoreItem(item.id); showToast('Deleted'); refetchStore() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  // ── Render helpers ──────────────────────────────────────────
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
                  title={rule.is_core ? 'Built-in — turn off instead of deleting' : 'Delete rule'}
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

  const renderItemForm = (id?: string) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Title *</label>
        <input value={itemForm.title} onChange={e => setItemForm((p: any) => ({...p, title: e.target.value}))}
          className="input" placeholder="e.g. Subscription Discount" />
      </div>
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
        <input value={itemForm.description} onChange={e => setItemForm((p: any) => ({...p, description: e.target.value}))}
          className="input text-sm" placeholder="Short description shown to students" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coin Cost *</label>
        <NumInput value={itemForm.coinCost} min={1} onChange={(v: number) => setItemForm((p: any) => ({...p, coinCost: v}))} placeholder="100"/>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Type</label>
        <select value={itemForm.itemType} onChange={e => setItemForm((p: any) => ({...p, itemType: e.target.value}))} className="input">
          {ITEM_TYPES.map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Item Value</label>
        <input value={itemForm.itemValue} onChange={e => setItemForm((p: any) => ({...p, itemValue: e.target.value}))}
          className="input text-sm" placeholder="e.g. 10% off, GOLD_BADGE" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Stock <span className="font-normal text-slate-400">(blank = unlimited)</span></label>
        <input type="number" min={0} value={itemForm.stock}
          onChange={e => setItemForm((p: any) => ({...p, stock: e.target.value}))}
          className="input" placeholder="∞ unlimited" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Sort Order</label>
        <NumInput value={itemForm.sortOrder} min={0} onChange={(v: number) => setItemForm((p: any) => ({...p, sortOrder: v}))} placeholder="0"/>
      </div>
      <div className="flex items-end pb-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <button type="button" onClick={() => setItemForm((p: any) => ({...p, isActive: !p.isActive}))}
            className={`relative w-10 h-5 rounded-full transition-colors ${itemForm.isActive ? 'bg-green-400' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${itemForm.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}/>
          </button>
          <span className="text-xs font-semibold text-slate-600">Active</span>
        </label>
      </div>
      <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
        <button onClick={() => saveItem(id)} disabled={creatingItem || !itemForm.title.trim() || !itemForm.coinCost}
          className="btn-primary text-sm disabled:opacity-40">
          {creatingItem ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : id ? 'Save Changes' : 'Create Item'}
        </button>
        <button onClick={() => { setEditingItem(null); setShowCreateItem(false); setItemForm(EMPTY_ITEM) }} className="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  )

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
                  : 'Master switch is off — no coins are being earned or spent anywhere in the app right now.'}
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

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button onClick={() => setTab('rules')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==='rules' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-2"><Coins size={14}/> Earning Rules</span>
          </button>
          <button onClick={() => setTab('store')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==='store' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-2"><ShoppingBag size={14}/> Coin Store</span>
          </button>
        </div>

        {/* ── Tab: Earning Rules ──────────────────────────────── */}
        {tab === 'rules' && (
          <>
            {/* Economy settings */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-brand-500"/>
                  <h2 className="font-bold text-slate-900 text-sm">Economy Settings</h2>
                </div>
                <button onClick={() => saveEconomy({
                    coinToInrRate: econForm.coinToInrRate,
                    maxCoinDiscountPctCourse: econForm.maxCoinDiscountPctCourse,
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max coin discount — courses &amp; materials</label>
                  <div className="relative">
                    <NumInput value={econForm.maxCoinDiscountPctCourse} min={0} max={100}
                      onChange={(v:number)=>{setEconForm((p:any)=>({...p,maxCoinDiscountPctCourse:v})); setEconDirty(true)}} placeholder="10" className="font-bold pr-7"/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Max % of a course/material price that can be paid with coins — e.g. 10% on ₹100 = 10 coins max</p>
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
                          <Info size={12}/> {categoryMeta(legacyKey).label} ({grouped[legacyKey].length}) {showLegacy ? '−' : '+'}
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
          </>
        )}

        {/* ── Tab: Coin Store ─────────────────────────────────── */}
        {tab === 'store' && (
          <div className="space-y-6">
            {/* Store Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900">Store Items</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Items students can purchase with coins in the app</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={refetchStore} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
                  <button onClick={() => { setShowCreateItem(true); setEditingItem(null); setItemForm(EMPTY_ITEM) }} className="btn-primary text-sm">
                    <Plus size={13}/> Add Item
                  </button>
                </div>
              </div>

              {showCreateItem && (
                <div className="card p-5 border-2 border-brand-200 bg-brand-50/20 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Plus size={15} className="text-brand-600"/> New Store Item</h3>
                    <button onClick={() => { setShowCreateItem(false); setItemForm(EMPTY_ITEM) }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={13}/></button>
                  </div>
                  {renderItemForm()}
                </div>
              )}

              {storeLoading ? <PageLoader /> : storeError ? <ErrorMessage message={storeError} onRetry={refetchStore}/> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeItems.map((item: any) => (
                    <div key={item.id} className={`card p-4 transition-all ${!item.is_active ? 'opacity-60' : ''}`}>
                      {editingItem === item.id ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-brand-600 uppercase">Editing</span>
                            <button onClick={() => setEditingItem(null)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"><X size={11}/></button>
                          </div>
                          {renderItemForm(item.id)}
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl shrink-0">
                              {TYPE_EMOJI[item.item_type] || '🎁'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                              {item.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
                            </div>
                            <span className={`badge shrink-0 ${item.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {item.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mb-3 text-xs text-slate-600">
                            <span className="font-black text-amber-700">🪙 {formatNumber(item.coin_cost)}</span>
                            <span className="text-slate-300">·</span>
                            <span className="capitalize">{item.item_type}</span>
                            {item.stock !== null && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className={item.stock === 0 ? 'text-red-500 font-semibold' : ''}>{item.stock === 0 ? 'Out of stock' : `${item.stock} left`}</span>
                              </>
                            )}
                            {item.redemption_count > 0 && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>{item.redemption_count} redeemed</span>
                              </>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => openEditItem(item)} className="flex-1 btn-secondary text-xs py-1.5"><Edit size={11}/> Edit</button>
                            <button onClick={() => deleteItem(item)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0">
                              <Trash2 size={12} className="text-red-500"/>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {storeItems.length === 0 && !storeLoading && (
                    <div className="col-span-full card p-12 text-center">
                      <ShoppingBag size={32} className="mx-auto mb-3 text-slate-200"/>
                      <p className="font-bold text-slate-600 mb-1">No store items yet</p>
                      <p className="text-xs text-slate-400 mb-3">Add items students can purchase with their coins</p>
                      <button onClick={() => setShowCreateItem(true)} className="btn-primary text-sm mx-auto"><Plus size={13}/> Add First Item</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Redemption History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900">Redemption History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Recent coin store purchases by students</p>
                </div>
                <button onClick={refetchRedemptions} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
              </div>
              <div className="card overflow-hidden">
                {redemptionsLoading ? <PageLoader /> : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Student</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Item</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Coins Spent</th>
                        <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {redemptions.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800 text-sm">{r.user_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{TYPE_EMOJI[r.item_type] || '🎁'}</span>
                              <span className="text-slate-700">{r.item_title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-amber-700">🪙 {formatNumber(r.coins_spent)}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">
                            {new Date(r.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                          </td>
                        </tr>
                      ))}
                      {redemptions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">No redemptions yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
