'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Edit, Save, X, RefreshCw, TrendingUp, Zap, Plus } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function CoinsPage() {
  const [editingId, setEditing]   = useState<string | null>(null)
  const [editCoins, setEditCoins] = useState(0)
  const [editMax, setEditMax]     = useState(0)
  const { showToast, ToastComponent } = useToast()

  const { data: rulesData, loading: rulesLoading, error: rulesError, refetch: refetchRules } = useApiData<any>(
    () => api.coins.getRules(), []
  )
  const { data: earnersData, loading: earnersLoading, refetch: refetchEarners } = useApiData<any>(
    () => api.coins.getTopEarners(), []
  )
  const rules: any[]   = rulesData?.rules || []
  const earners: any[] = earnersData?.earners || []

  const { data: statsData } = useApiData<any>(() => api.dashboard.getStats(), [])
  const stats = statsData

  const { mutate: updateRule, loading: updatingRule } = useMutation(
    (id: string, data: any) => api.coins.updateRule(id, data),
    {
      onSuccess: () => { setEditing(null); refetchRules(); showToast('Rule updated — effective immediately ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: toggleRule } = useMutation(
    (id: string, isActive: boolean) => api.coins.updateRule(id, { isActive }),
    { onSuccess: () => refetchRules(), onError: (m) => showToast(m, 'error') }
  )

  // Create new rule state
  const [showCreate, setShowCreate] = useState(false)
  const [newRule, setNewRule] = useState({ action: '', description: '', coinsAwarded: 5, maxPerDay: 1 })
  const [creating, setCreating] = useState(false)

  const createRule = async () => {
    if (!newRule.action.trim() || !newRule.description.trim()) {
      showToast('Action and description are required', 'error'); return
    }
    setCreating(true)
    try {
      await api.coins.createRule(newRule)
      showToast('Rule created ✅')
      setShowCreate(false)
      setNewRule({ action: '', description: '', coinsAwarded: 5, maxPerDay: 1 })
      refetchRules()
    } catch (e: any) { showToast(e.message || 'Failed to create rule', 'error') }
    finally { setCreating(false) }
  }

  const deleteRule = async (id: string, desc: string) => {
    if (!confirm(`Delete rule: "${desc}"?`)) return
    try {
      await api.coins.deleteRule(id)
      showToast('Rule deleted')
      refetchRules()
    } catch (e: any) { showToast(e.message || 'Failed to delete', 'error') }
  }

  const startEdit = (rule: any) => {
    setEditing(rule.id)
    setEditCoins(rule.coins_awarded)
    setEditMax(rule.max_per_day)
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coins & Rewards" subtitle="Manage coin earning rules and reward system" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Coin Economy Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Circulation', value: formatNumber(stats?.coinCirculation || 0), emoji: '🪙', color: 'bg-yellow-50' },
            { label: 'Active Rules',      value: rules.filter(r => r.is_active).length,    emoji: '⚡', color: 'bg-green-50' },
            { label: 'Total Rules',       value: rules.length,                             emoji: '📋', color: 'bg-blue-50' },
            { label: 'Top Earners',       value: earners.length,                           emoji: '🏆', color: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.color}`}>
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Coin value info */}
        <div className="card p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪙</span>
              <div>
                <p className="font-bold text-slate-900">Coin Exchange Rate</p>
                <p className="text-sm text-slate-600">1 Coin = ₹0.10 discount value</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-700">30%</p>
                <p className="text-xs text-slate-500">Max via coins (Subscription)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-700">50%</p>
                <p className="text-xs text-slate-500">Max via coins (Course)</p>
              </div>
              <a href="/settings" className="btn-secondary text-xs">Edit in Settings →</a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Earning Rules */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Earning Rules</h2>
              <button onClick={refetchRules} className="btn-secondary text-xs"><RefreshCw size={12} /></button>
            </div>

            {rulesLoading ? <PageLoader /> : rulesError ? (
              <ErrorMessage message={rulesError} onRetry={refetchRules} />
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Action', 'Description', 'Coins', 'Max/Day', 'Total Awarded', 'Active', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr key={rule.id} className="table-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500 shrink-0" />
                            <code className="text-xs font-mono text-slate-700">{rule.action}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{rule.description}</td>
                        <td className="px-4 py-3">
                          {editingId === rule.id ? (
                            <input type="number" value={editCoins} onChange={e => setEditCoins(Number(e.target.value))} className="input w-16 text-center text-xs" />
                          ) : (
                            <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200">🪙 {rule.coins_awarded}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === rule.id ? (
                            <input type="number" value={editMax} onChange={e => setEditMax(Number(e.target.value))} className="input w-16 text-center text-xs" />
                          ) : (
                            <span className="text-slate-700 font-semibold">{rule.max_per_day}x</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-green-500" />
                            <span className="font-semibold text-slate-800">{formatNumber(parseInt(rule.total_awarded || 0))}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleRule(rule.id, !rule.is_active)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${rule.is_active ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === rule.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateRule(rule.id, { coinsAwarded: editCoins, maxPerDay: editMax })}
                                className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center">
                                <Save size={12} className="text-green-600" />
                              </button>
                              <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center">
                                <X size={12} className="text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEdit(rule)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center" title="Edit">
                                <Edit size={12} className="text-yellow-600" />
                              </button>
                              <button onClick={() => deleteRule(rule.id, rule.description)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center" title="Delete">
                                <X size={12} className="text-red-500" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Rule Form */}
          {showCreate && (
            <div className="mt-4 card p-5 border-2 border-brand-200 bg-brand-50/30">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus size={16} className="text-brand-600" /> New Earning Rule
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Action Key *</label>
                  <input value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))}
                    placeholder="e.g. daily_quiz" className="input w-full font-mono text-sm" />
                  <p className="text-[10px] text-slate-400 mt-0.5">snake_case identifier used in code</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
                  <input value={newRule.description} onChange={e => setNewRule(r => ({ ...r, description: e.target.value }))}
                    placeholder="e.g. Complete a daily quiz" className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Coins Awarded</label>
                  <input type="number" value={newRule.coinsAwarded} min={1} max={1000}
                    onChange={e => setNewRule(r => ({ ...r, coinsAwarded: Number(e.target.value) }))}
                    className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Per Day</label>
                  <input type="number" value={newRule.maxPerDay} min={1} max={100}
                    onChange={e => setNewRule(r => ({ ...r, maxPerDay: Number(e.target.value) }))}
                    className="input w-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createRule} disabled={creating || !newRule.action.trim() || !newRule.description.trim()}
                  className="btn-primary text-sm">
                  {creating ? 'Creating…' : 'Create Rule'}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Add Rule button (visible when form hidden) */}
          {!showCreate && (
            <button onClick={() => setShowCreate(true)}
              className="mt-3 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-semibold">
              <Plus size={14} /> Add New Earning Rule
            </button>
          )}

          {/* Top Earners */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0">Top Earners</h2>
              <button onClick={refetchEarners} className="btn-secondary text-xs"><RefreshCw size={12} /></button>
            </div>
            <div className="card p-4">
              {earnersLoading ? <PageLoader /> : (
                <div className="space-y-3">
                  {earners.slice(0, 10).map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-slate-400 text-center">
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
                        {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.primary_exam || '—'}</p>
                      </div>
                      <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200">🪙 {formatNumber(u.coins)}</span>
                    </div>
                  ))}
                  {earners.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-4">No data yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
