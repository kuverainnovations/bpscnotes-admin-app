'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  RefreshCw, Edit, Users, Trophy, BarChart3, CheckCircle,
  AlertTriangle, X, Crown, Zap, ArrowUp, Save, Loader2,
  Shield, Star, Target,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'

// Issue 3: New tier names
// Map old tier keys to new ones for backwards compat
const TIER_KEY_ALIAS: Record<string,string> = {
  silver:'starter', gold:'serious', premium:'consistent', diamond:'achiever',
  Silver:'starter', Gold:'serious', Premium:'consistent', Diamond:'achiever',
}
const normTierKey = (k: string) => TIER_KEY_ALIAS[k] || k?.toLowerCase() || 'starter'

const TIER_META: Record<string,{label:string;emoji:string;color:string;bg:string;border:string;gradient:string}> = {
  starter:    { label:'Starter',    emoji:'🌱', color:'text-slate-700',  bg:'bg-slate-50',   border:'border-slate-200', gradient:'from-slate-400 to-slate-500' },
  serious:    { label:'Serious',    emoji:'⚡', color:'text-amber-800',  bg:'bg-amber-50',   border:'border-amber-200', gradient:'from-amber-400 to-amber-500' },
  consistent: { label:'Consistent', emoji:'💎', color:'text-purple-800', bg:'bg-purple-50',  border:'border-purple-200',gradient:'from-purple-500 to-purple-600' },
  achiever:   { label:'Achiever',   emoji:'🏆', color:'text-cyan-800',   bg:'bg-cyan-50',    border:'border-cyan-200',  gradient:'from-cyan-500 to-cyan-600' },
}

function NumInput({ value, onChange, placeholder='', min=0 }: any) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  useEffect(() => { setRaw(value===0?'':String(value)) }, [value])
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={min}
      onChange={e => { setRaw(e.target.value); const n=parseFloat(e.target.value); if(!isNaN(n)) onChange(n) }}
      onBlur={() => { if(!raw.trim()) { setRaw(''); onChange(0) } }}/>
  )
}

export default function TierRoomsPage() {
  const { showToast, ToastComponent } = useToast()
  const [tiers, setTiers]       = useState<any[]>([])
  const [rules, setRules]       = useState<any[]>([])
  const [dist, setDist]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'tiers'|'rules'|'promote'>('tiers')
  const [editTier, setEditTier] = useState<any>(null)
  const [editRule, setEditRule] = useState<any>(null)
  const [saving, setSaving]     = useState(false)
  const [promoteUserId, setPromoteUserId] = useState('')
  const [promoteTarget, setPromoteTarget] = useState('serious')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [tr, rr, dr] = await Promise.all([
        api.tierRooms.getAllTiers(), api.tierRooms.getRules(), api.tierRooms.getDistribution()
      ])
      setTiers(tr.data?.tiers||[]); setRules(rr.data?.rules||[]); setDist(dr.data?.distribution||[])
    } catch (e: any) { showToast(e.message||'Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  const saveTier = async () => {
    if (!editTier) return
    setSaving(true)
    try {
      await api.tierRooms.updateTier(editTier.id, {
        name: editTier.name, description: editTier.description,
        coin_multiplier: parseFloat(editTier.coin_multiplier),
        xp_multiplier:   parseFloat(editTier.xp_multiplier),
        max_members:     parseInt(editTier.max_members),
        perks: editTier.perks, is_active: editTier.is_active,
      })
      setEditTier(null); showToast('Tier updated ✅'); loadAll()
    } catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setSaving(false) }
  }

  const saveRule = async () => {
    if (!editRule) return
    setSaving(true)
    try {
      await api.tierRooms.updateRule(editRule.id, {
        min_study_hours:     parseFloat(editRule.min_study_hours),
        min_quizzes_completed: parseInt(editRule.min_quizzes_completed),
        min_streak_days:     parseInt(editRule.min_streak_days),
        evaluation_period:   editRule.evaluation_period,
      })
      setEditRule(null); showToast('Rule updated ✅'); loadAll()
    } catch (e: any) { showToast(e.message||'Failed', 'error') }
    finally { setSaving(false) }
  }

  const promote = async () => {
    if (!promoteUserId.trim()) { showToast('Enter a user ID', 'error'); return }
    try {
      await api.tierRooms.promoteUser({ userId: promoteUserId, targetTierKey: promoteTarget })
      showToast(`User promoted to ${TIER_META[promoteTarget]?.label||promoteTarget} ✅`)
      setPromoteUserId('')
    } catch (e: any) { showToast(e.message||'Failed', 'error') }
  }

  const totalUsers = dist.reduce((a:number,d:any)=>a+parseInt(d.users||0),0)||1

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Tier Rooms" subtitle="Manage study tiers, progression rules and user distribution" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Tier distribution strip */}
        {dist.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dist.map((d:any) => {
              const meta = TIER_META[normTierKey(d.tier_key || d.key || d.name || '')] || TIER_META.starter
              const pct  = Math.round(parseInt(d.users||0)/totalUsers*100)
              return (
                <div key={d.tier_key} className={`card p-4 flex items-center gap-3 ${meta.bg} border ${meta.border}`}>
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <p className={`text-xl font-black ${meta.color}`}>{formatNumber(d.users)}</p>
                    <p className="text-xs text-slate-500 font-medium">{meta.label} · {pct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          {(['tiers','rules','promote'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize
                ${activeTab===t?'bg-white shadow-sm text-brand-700':'text-slate-500 hover:text-slate-700'}`}>
              {t === 'tiers' ? '🏷️ Tier Config' : t === 'rules' ? '📋 Progression Rules' : '⬆️ Promote User'}
            </button>
          ))}
          <div className="ml-2">
            <button onClick={loadAll} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          </div>
          <Link href="/tier-rooms/flagged" className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 ml-1">
            <AlertTriangle size={12} className="text-amber-500"/> Anti-Cheat
          </Link>
        </div>

        {loading ? (
          <div className="card p-16 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-400"/></div>
        ) : (
          <>
            {/* TIERS TAB */}
            {activeTab === 'tiers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {tiers.map(tier => {
                  const meta = TIER_META[normTierKey(tier.key || tier.name || '')] || TIER_META.starter
                  const isEditing = editTier?.id === tier.id
                  return (
                    <div key={tier.id} className={`card overflow-hidden border ${meta.border}`}>
                      {/* Gradient header */}
                      <div className={`bg-gradient-to-br ${meta.gradient} p-4 text-white`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">{meta.emoji}</span>
                          <span className={`badge bg-white/20 text-white border-white/20 text-xs`}>{tier.is_active?'Active':'Off'}</span>
                        </div>
                        <p className="font-black text-lg">{meta.label}</p>
                        <p className="text-white/70 text-xs mt-0.5">{tier.description}</p>
                      </div>

                      <div className="p-4 space-y-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Description</label>
                              <input value={editTier.description} onChange={e => setEditTier({...editTier,description:e.target.value})} className="input text-xs w-full"/>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Coin ×</label>
                                <NumInput value={editTier.coin_multiplier} onChange={(v:number)=>setEditTier({...editTier,coin_multiplier:v})} placeholder="1.0"/>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">XP ×</label>
                                <NumInput value={editTier.xp_multiplier} onChange={(v:number)=>setEditTier({...editTier,xp_multiplier:v})} placeholder="1.0"/>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Max Members</label>
                              <NumInput value={editTier.max_members} onChange={(v:number)=>setEditTier({...editTier,max_members:v})} placeholder="50"/>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveTier} disabled={saving} className="btn-primary text-xs flex-1">
                                {saving?<Loader2 size={12} className="animate-spin mx-auto"/>:<><Save size={12}/> Save</>}
                              </button>
                              <button onClick={() => setEditTier(null)} className="btn-secondary text-xs px-3"><X size={12}/></button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label:'Coin ×',    value:`${tier.coin_multiplier||1}×` },
                                { label:'XP ×',      value:`${tier.xp_multiplier||1}×` },
                                { label:'Max Members',value:tier.max_members||50 },
                                { label:'Members',   value:formatNumber(tier.member_count||0) },
                              ].map(s => (
                                <div key={s.label} className={`${meta.bg} rounded-xl p-2.5 text-center border ${meta.border}`}>
                                  <p className={`text-sm font-black ${meta.color}`}>{s.value}</p>
                                  <p className="text-[9px] text-slate-400">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            {(tier.perks||[]).length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">Perks</p>
                                {(tier.perks||[]).slice(0,3).map((p:string,i:number) => (
                                  <p key={i} className="text-xs text-slate-600 flex items-start gap-1"><CheckCircle size={10} className="mt-0.5 text-green-500 shrink-0"/>{p}</p>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setEditTier({...tier})} className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5">
                              <Edit size={12}/> Edit Config
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                {rules.map(rule => {
                  const fromMeta = TIER_META[normTierKey(rule.from_tier)] || TIER_META.starter
                  const toMeta   = TIER_META[normTierKey(rule.to_tier)] || TIER_META.serious
                  const isEditing = editRule?.id === rule.id
                  return (
                    <div key={rule.id} className="card p-5">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-xl">{fromMeta.emoji}</span>
                        <span className="font-bold text-slate-500 text-sm">{fromMeta.label}</span>
                        <ArrowUp size={16} className="text-brand-500"/>
                        <span className="text-xl">{toMeta.emoji}</span>
                        <span className="font-bold text-slate-800 text-sm">{toMeta.label}</span>
                        {!isEditing && (
                          <button onClick={() => setEditRule({...rule})} className="ml-auto btn-secondary text-xs flex items-center gap-1.5">
                            <Edit size={12}/> Edit
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Study Hours</label>
                            <NumInput value={editRule.min_study_hours} onChange={(v:number)=>setEditRule({...editRule,min_study_hours:v})} placeholder="10"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Quizzes Done</label>
                            <NumInput value={editRule.min_quizzes_completed} onChange={(v:number)=>setEditRule({...editRule,min_quizzes_completed:v})} placeholder="5"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Streak Days</label>
                            <NumInput value={editRule.min_streak_days} onChange={(v:number)=>setEditRule({...editRule,min_streak_days:v})} placeholder="3"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Period</label>
                            <input value={editRule.evaluation_period} onChange={e=>setEditRule({...editRule,evaluation_period:e.target.value})} className="input w-full" placeholder="7d"/>
                          </div>
                          <div className="col-span-2 md:col-span-4 flex gap-2">
                            <button onClick={saveRule} disabled={saving} className="btn-primary text-sm"><Save size={13}/> {saving?'Saving…':'Save Rule'}</button>
                            <button onClick={() => setEditRule(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 flex-wrap text-sm">
                          {[
                            { label:'Study Hours', value:`≥ ${rule.min_study_hours||0}h`, icon:'⏱️' },
                            { label:'Quizzes',     value:`≥ ${rule.min_quizzes_completed||0}`,icon:'📝' },
                            { label:'Streak',      value:`≥ ${rule.min_streak_days||0} days`,icon:'🔥' },
                            { label:'Period',      value:rule.evaluation_period||'7d',      icon:'📅' },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-sm">{s.icon}</span>
                              <span className="text-xs font-bold text-slate-700">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* PROMOTE TAB */}
            {activeTab === 'promote' && (
              <div className="card p-6 max-w-md space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center"><ArrowUp size={20} className="text-brand-600"/></div>
                  <div>
                    <h3 className="font-bold text-slate-900">Manually Promote User</h3>
                    <p className="text-xs text-slate-500">Override automatic tier assignment</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">User ID</label>
                  <input value={promoteUserId} onChange={e => setPromoteUserId(e.target.value)} className="input w-full" placeholder="Paste user UUID…"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Promote To</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={promoteTarget} onChange={e => setPromoteTarget(e.target.value)} className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {Object.entries(TIER_META).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={promote} disabled={!promoteUserId.trim()} className="btn-primary w-full disabled:opacity-40">
                  <ArrowUp size={14}/> Promote User
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}