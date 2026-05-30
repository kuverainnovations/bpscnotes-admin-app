'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { PageLoader, PageError } from '@/components/ui/PageComponents'
import api from '@/lib/api'
import {
  RefreshCw, Edit, Users, Trophy, BarChart3,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  X, Crown, Zap, ArrowUp, ArrowDown,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// FILE: admin/src/app/(dashboard)/tier-rooms/page.tsx
//
// Sections:
//   1. Stats bar (members per tier, active sessions)
//   2. Tier Cards — edit coin_multiplier, xp_multiplier, perks
//   3. Progression Rules — edit thresholds for each transition
//   4. Distribution chart (% users per tier)
//   5. Manual promote/demote a user
// ─────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  silver:  { bg: 'bg-slate-50',   border: 'border-slate-300', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  gold:    { bg: 'bg-yellow-50',  border: 'border-yellow-300',text: 'text-yellow-800',badge: 'bg-yellow-100 text-yellow-800' },
  premium: { bg: 'bg-purple-50',  border: 'border-purple-300',text: 'text-purple-800',badge: 'bg-purple-100 text-purple-800' },
  diamond: { bg: 'bg-cyan-50',    border: 'border-cyan-300',  text: 'text-cyan-800',  badge: 'bg-cyan-100 text-cyan-800' },
}

// Display names for tiers — backend stores old names, we show new ones
const TIER_LABEL: Record<string, string> = {
  silver: 'Starter', gold: 'Serious', premium: 'Consistent', diamond: 'Achiever',
}
const tierLabel = (key: string) => TIER_LABEL[key?.toLowerCase()] || key

export default function TierRoomsPage() {
  const [tiers, setTiers]             = useState<any[]>([])
  const [rules, setRules]             = useState<any[]>([])
  const [distribution, setDist]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeTab, setActiveTab]     = useState<'tiers' | 'rules' | 'distribution' | 'promote'>('tiers')

  // Modal states
  const [editTier, setEditTier]       = useState<any>(null)
  const [editRule, setEditRule]       = useState<any>(null)
  const [showPromote, setShowPromote] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState('')

  // Promote form
  const [promoteUserId, setPromoteUserId]   = useState('')
  const [promoteTarget, setPromoteTarget]   = useState('serious')

  const loadAll = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [tiersRes, rulesRes, distRes] = await Promise.all([
        api.tierRooms.getAllTiers(),
        api.tierRooms.getRules(),
        api.tierRooms.getDistribution(),
      ])
      setTiers(tiersRes.data?.tiers || [])
      setRules(rulesRes.data?.rules || [])
      setDist(distRes.data?.distribution || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load tier rooms data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const flash = (msg: string) => {
    setSaveMsg(msg); setTimeout(() => setSaveMsg(''), 3000)
  }

  // ── Save tier edits ──────────────────────────────────────
  const saveTier = async () => {
    if (!editTier) return
    setSaving(true)
    try {
      await api.tierRooms.updateTier(editTier.id, {
        name:            editTier.name,
        description:     editTier.description,
        coin_multiplier: parseFloat(editTier.coin_multiplier),
        xp_multiplier:   parseFloat(editTier.xp_multiplier),
        max_members:     parseInt(editTier.max_members),
        perks:           editTier.perks,
        is_active:       editTier.is_active,
      })
      setEditTier(null)
      flash('✅ Tier updated successfully')
      loadAll()
    } catch (e: any) {
      flash('❌ ' + (e.message || 'Failed to update tier'))
    } finally {
      setSaving(false)
    }
  }

  // ── Save rule edits ──────────────────────────────────────
  const saveRule = async () => {
    if (!editRule) return
    setSaving(true)
    try {
      await api.tierRooms.updateRule(editRule.id, {
        min_total_study_hours:  parseFloat(editRule.min_total_study_hours),
        min_streak_days:        parseInt(editRule.min_streak_days),
        min_quizzes_completed:  parseInt(editRule.min_quizzes_completed),
        min_accuracy_pct:       parseFloat(editRule.min_accuracy_pct),
        evaluation_window_days: parseInt(editRule.evaluation_window_days),
        demotion_threshold_pct: parseFloat(editRule.demotion_threshold_pct),
        demotion_grace_days:    parseInt(editRule.demotion_grace_days),
        is_active:              editRule.is_active,
      })
      setEditRule(null)
      flash('✅ Rule updated successfully')
      loadAll()
    } catch (e: any) {
      flash('❌ ' + (e.message || 'Failed to update rule'))
    } finally {
      setSaving(false)
    }
  }

  // ── Manual promote ───────────────────────────────────────
  const handlePromote = async () => {
    if (!promoteUserId.trim()) { flash('❌ User ID is required'); return }
    setSaving(true)
    try {
      await api.tierRooms.promoteUser({ userId: promoteUserId.trim(), targetTierKey: promoteTarget })
      setShowPromote(false)
      setPromoteUserId('')
      flash(`✅ User promoted to ${promoteTarget}`)
    } catch (e: any) {
      flash('❌ ' + (e.message || 'Promotion failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (error && !tiers.length) return <PageError message={error} onRetry={loadAll} />

  // ── Stats bar ────────────────────────────────────────────
  const totalMembers  = tiers.reduce((s, t) => s + (t.total_members || 0), 0)
  const totalActive   = tiers.reduce((s, t) => s + (t.active_sessions || 0), 0)

  return (
    <div className="min-h-screen">
      <Header
        title="Tier Room System"
        subtitle="Configure study tiers, progression rules, and rewards"
      />

      <div className="p-6 space-y-5">

        {/* ── Save message toast ───────────────────────────── */}
        {saveMsg && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${saveMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {saveMsg}
          </div>
        )}

        {/* ── Top Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji: '👥', label: 'Total Members', value: totalMembers.toLocaleString() },
            { emoji: '🟢', label: 'Active Sessions', value: totalActive },
            { emoji: '🏆', label: 'Tier Levels',    value: tiers.length },
            { emoji: '⚙️', label: 'Active Rules',   value: rules.filter(r => r.is_active).length },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Bar ─────────────────────────────────────── */}
        <div className="card p-1 flex gap-1">
          {([
            { key: 'tiers',        label: '⚙️ Tier Settings',     icon: Crown },
            { key: 'rules',        label: '📈 Progression Rules', icon: ArrowUp },
            { key: 'distribution', label: '📊 Distribution',      icon: BarChart3 },
            { key: 'promote',      label: '🚀 Promote User',      icon: Zap },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* TAB 1: Tier Settings                            */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Room Tier Configuration</p>
                <p className="text-xs text-slate-500 mt-0.5">Edit coin multipliers, XP rates, and perks. Changes reflect immediately in the Android app.</p>
              </div>
              <button onClick={loadAll} className="btn-secondary"><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {tiers.map(tier => {
                const colors = TIER_COLORS[tier.tier_key] || TIER_COLORS.silver
                return (
                  <div key={tier.id} className={`card p-5 border-2 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{tier.icon_emoji}</span>
                        <div>
                          <p className={`font-bold text-lg ${colors.text}`}>{tierLabel(tier.tier_key || tier.name)}</p>
                          <p className="text-xs text-slate-500">{tier.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.badge}`}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => setEditTier({ ...tier, perks: tier.perks || [] })}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          <Edit size={12} /> Edit
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/60 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{tier.coin_multiplier}×</p>
                        <p className="text-xs text-slate-500">Coin/hour rate</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{tier.xp_multiplier}×</p>
                        <p className="text-xs text-slate-500">XP multiplier</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{(tier.total_members || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Members</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-bold ${tier.active_sessions > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {tier.active_sessions || 0}
                        </p>
                        <p className="text-xs text-slate-500">Active now</p>
                      </div>
                    </div>

                    {/* Perks */}
                    {tier.perks?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-600">Perks shown in app:</p>
                        {tier.perks.map((p: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle size={11} className="text-green-500 shrink-0" />
                            <p className="text-xs text-slate-600">{p}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB 2: Progression Rules                        */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">Tier Progression Rules</p>
              <p className="text-xs text-slate-500 mt-0.5">
                All non-zero conditions must be met (AND logic) for a user to be promoted.
                The cron job evaluates these daily at 00:05 UTC.
              </p>
            </div>

            <div className="card overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-2">Transition</div>
                  <div>Study Hours</div>
                  <div>Streak Days</div>
                  <div>Quizzes</div>
                  <div>Accuracy %</div>
                  <div>Actions</div>
                </div>
              </div>

              {rules.map(rule => (
                <div key={rule.id} className="px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="grid grid-cols-7 gap-2 items-center text-sm">
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {tiers.find(t => t.tier_key === rule.from_key)?.icon_emoji || '🔘'}
                        </span>
                        <ArrowUp size={14} className="text-green-500 shrink-0" />
                        <span className="text-base">
                          {tiers.find(t => t.tier_key === rule.to_key)?.icon_emoji || '🔘'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">{rule.from_name} → {rule.to_name}</p>
                          <div className="flex gap-1 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {rule.is_active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-700 font-medium">{rule.min_total_study_hours > 0 ? `${rule.min_total_study_hours}h` : '—'}</div>
                    <div className="text-slate-700 font-medium">{rule.min_streak_days > 0 ? `${rule.min_streak_days}d` : '—'}</div>
                    <div className="text-slate-700 font-medium">{rule.min_quizzes_completed > 0 ? rule.min_quizzes_completed : '—'}</div>
                    <div className="text-slate-700 font-medium">{rule.min_accuracy_pct > 0 ? `${rule.min_accuracy_pct}%` : '—'}</div>
                    <div>
                      <button
                        onClick={() => setEditRule({ ...rule })}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        <Edit size={12} /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Demotion info */}
                  <div className="mt-2 ml-0 flex items-center gap-4 text-xs text-slate-400">
                    <span>⬇️ Demote if below {rule.demotion_threshold_pct}% for {rule.demotion_grace_days} days</span>
                    <span>📅 Eval window: {rule.evaluation_window_days} days</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-4 bg-amber-50 border border-amber-200">
              <div className="flex gap-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">How promotion works</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Every day at 00:05 UTC, the cron job scans all users in each tier.
                    If a user meets <strong>all non-zero conditions</strong> (AND logic),
                    they are promoted. If their score falls below the demotion threshold
                    for the configured grace period, they are demoted.
                    A 3-day grace period is always applied after promotion before demotion
                    can happen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB 3: Distribution Chart                       */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'distribution' && (
          <div className="space-y-4">
            <p className="font-semibold text-slate-900">User Distribution Across Tiers</p>

            <div className="card p-6">
              {/* Bar chart */}
              <div className="space-y-4">
                {distribution.map((d: any) => {
                  const pct = parseFloat(d.percentage) || 0
                  const colors = TIER_COLORS[d.tier_key] || TIER_COLORS.silver
                  return (
                    <div key={d.tier_key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{d.icon_emoji}</span>
                          <span className="font-semibold text-slate-800">{d.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {d.member_count.toLocaleString()} members
                          </span>
                        </div>
                        <span className="font-bold text-slate-700">{pct}%</span>
                      </div>
                      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: d.color_hex,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Insight */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {distribution.map((d: any) => (
                  <div key={d.tier_key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <span className="text-2xl">{d.icon_emoji}</span>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{d.member_count.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{d.name} members</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Healthy distribution target:</span>{' '}
                ~60% Silver, ~25% Gold, ~12% Premium, ~3% Diamond.
                If Silver is over 80%, consider lowering the Silver→Gold threshold.
                If Diamond is over 10%, the Diamond tier may feel less exclusive.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* TAB 4: Manual Promote/Demote                    */}
        {/* ════════════════════════════════════════════════ */}
        {activeTab === 'promote' && (
          <div className="max-w-lg space-y-4">
            <div>
              <p className="font-semibold text-slate-900">Manual Tier Override</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Manually promote or demote a user to any tier. Use for contest winners,
                special events, or correcting wrong placements.
              </p>
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">User ID *</label>
                <input
                  type="text"
                  placeholder="Paste the user UUID from the Users page"
                  value={promoteUserId}
                  onChange={e => setPromoteUserId(e.target.value)}
                  className="input"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Find user IDs in the <a href="/users" className="text-brand-600 underline">User Management</a> page.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Target Tier *</label>
                <div className="grid grid-cols-2 gap-2">
                  {tiers.map(tier => {
                    const colors = TIER_COLORS[tier.tier_key] || TIER_COLORS.silver
                    return (
                      <button
                        key={tier.tier_key}
                        onClick={() => setPromoteTarget(tier.tier_key)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          promoteTarget === tier.tier_key
                            ? `${colors.border} ${colors.bg}`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">{tier.icon_emoji}</span>
                        <div className="text-left">
                          <p className={`text-sm font-bold ${promoteTarget === tier.tier_key ? colors.text : 'text-slate-700'}`}>
                            {tierLabel(tier.tier_key || tier.name)}
                          </p>
                          <p className="text-xs text-slate-400">{tier.coin_multiplier}× coins</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">⚠️ Manual overrides bypass progression rules</p>
                <p>The user's next-tier progress will be reset to 0. A 3-day demotion grace period will apply.</p>
              </div>

              <button
                onClick={handlePromote}
                disabled={saving || !promoteUserId.trim()}
                className="btn-primary w-full justify-center"
              >
                {saving ? 'Promoting...' : `Promote to ${tiers.find(t => t.tier_key === promoteTarget)?.name || promoteTarget}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* EDIT TIER MODAL                                  */}
      {/* ════════════════════════════════════════════════ */}
      {editTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900 text-lg">Edit {editTier.name}</p>
                <p className="text-xs text-slate-500">Changes reflect immediately in the Android app</p>
              </div>
              <button onClick={() => setEditTier(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
                <input type="text" value={editTier.name} onChange={e => setEditTier({ ...editTier, name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows={2} value={editTier.description || ''} onChange={e => setEditTier({ ...editTier, description: e.target.value })} className="input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Coin Multiplier
                    <span className="text-slate-400 font-normal ml-1">(base 6 coins/hr × this)</span>
                  </label>
                  <input type="number" step="0.25" min="0.5" max="5" value={editTier.coin_multiplier}
                    onChange={e => setEditTier({ ...editTier, coin_multiplier: e.target.value })} className="input" />
                  <p className="text-xs text-slate-400 mt-1">
                    = {(6 * parseFloat(editTier.coin_multiplier || 1)).toFixed(0)} coins/hour
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    XP Multiplier
                    <span className="text-slate-400 font-normal ml-1">(base 1 XP/min × this)</span>
                  </label>
                  <input type="number" step="0.25" min="0.5" max="5" value={editTier.xp_multiplier}
                    onChange={e => setEditTier({ ...editTier, xp_multiplier: e.target.value })} className="input" />
                  <p className="text-xs text-slate-400 mt-1">
                    = {(60 * parseFloat(editTier.xp_multiplier || 1)).toFixed(0)} XP/hour
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Members</label>
                <input type="number" min="10" value={editTier.max_members}
                  onChange={e => setEditTier({ ...editTier, max_members: e.target.value })} className="input" />
              </div>

              {/* Perks editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Perks (shown in Android app)
                </label>
                {(editTier.perks || []).map((perk: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={perk}
                      onChange={e => {
                        const p = [...editTier.perks]; p[i] = e.target.value
                        setEditTier({ ...editTier, perks: p })
                      }}
                      className="input flex-1"
                      placeholder="e.g. 9 coins/hour study"
                    />
                    <button
                      onClick={() => {
                        const p = editTier.perks.filter((_: any, idx: number) => idx !== i)
                        setEditTier({ ...editTier, perks: p })
                      }}
                      className="w-8 h-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setEditTier({ ...editTier, perks: [...(editTier.perks || []), ''] })}
                  className="btn-secondary text-xs"
                >
                  + Add Perk
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input type="checkbox" id="tierActive" checked={editTier.is_active}
                  onChange={e => setEditTier({ ...editTier, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-500" />
                <label htmlFor="tierActive" className="text-sm text-slate-700 font-medium cursor-pointer">
                  Tier is visible and active
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setEditTier(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveTier} disabled={saving} className="flex-1 btn-primary">
                {saving ? 'Saving…' : 'Save Tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* EDIT RULE MODAL                                  */}
      {/* ════════════════════════════════════════════════ */}
      {editRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900 text-lg">Edit Progression Rule</p>
                <p className="text-xs text-slate-500">{editRule.from_name} → {editRule.to_name}</p>
              </div>
              <button onClick={() => setEditRule(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                ⚠️ Set a field to <strong>0</strong> to ignore that condition.
                Users must meet <strong>ALL non-zero conditions</strong> to be promoted.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'min_total_study_hours', label: 'Min Total Study Hours', step: '0.5', hint: '0 = ignore' },
                  { key: 'min_streak_days', label: 'Min Streak Days', step: '1', hint: '0 = ignore' },
                  { key: 'min_quizzes_completed', label: 'Min Quizzes', step: '1', hint: '0 = ignore' },
                  { key: 'min_accuracy_pct', label: 'Min Accuracy %', step: '1', hint: '0 = ignore' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                    <input type="number" step={f.step} min="0" value={editRule[f.key]}
                      onChange={e => setEditRule({ ...editRule, [f.key]: e.target.value })} className="input" />
                    <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-700 mb-3">Demotion Settings</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'evaluation_window_days', label: 'Eval Window (days)', hint: 'Rolling window for weekly stats' },
                    { key: 'demotion_threshold_pct', label: 'Demotion Threshold %', hint: 'Below this = at risk' },
                    { key: 'demotion_grace_days', label: 'Grace Days', hint: 'Days before demotion' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{f.label}</label>
                      <input type="number" step="1" min="1" value={editRule[f.key]}
                        onChange={e => setEditRule({ ...editRule, [f.key]: e.target.value })} className="input" />
                      <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input type="checkbox" id="ruleActive" checked={editRule.is_active}
                  onChange={e => setEditRule({ ...editRule, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-500" />
                <label htmlFor="ruleActive" className="text-sm text-slate-700 font-medium cursor-pointer">
                  Rule is active (uncheck to pause promotion for this tier transition)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setEditRule(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={saveRule} disabled={saving} className="flex-1 btn-primary">
                {saving ? 'Saving…' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}