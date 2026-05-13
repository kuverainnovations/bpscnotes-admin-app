'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { Plus, Edit, Trash2, RefreshCw, Trophy, X, CheckCircle } from 'lucide-react'

const CATEGORIES   = ['study','streak','quiz','social','tier','challenge']
const COND_TYPES   = [
  { value:'study_hours',  label:'Study Hours',   hint:'Total accumulated study hours' },
  { value:'streak_days',  label:'Streak Days',   hint:'Consecutive study days' },
  { value:'quizzes',      label:'Quizzes Done',  hint:'Total quizzes completed' },
  { value:'goals',        label:'Goals Done',    hint:'Total daily goals completed' },
  { value:'tier_reach',   label:'Tier Reached',  hint:'User has reached this tier' },
  { value:'coins',        label:'Coins Earned',  hint:'Total coins ever earned' },
]
const TIER_KEYS    = ['silver','gold','premium','diamond']
const emptyForm    = { key:'', title:'', description:'', emoji:'🏅', category:'study', condition:{ type:'study_hours', threshold:10 }, coinsReward:0, xpReward:0, sortOrder:0, isActive:true }

export default function AchievementsAdminPage() {
  const [list, setList]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setModal] = useState(false)
  const [form, setForm]       = useState<any>(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.adminAchievements.list(); setList(r.data?.achievements || []) }
    catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const save = async () => {
    if (!form.key || !form.title) { flash('❌ Key and title are required'); return }
    setSaving(true)
    try {
      await api.adminAchievements.create(form)
      setModal(false); setForm(emptyForm); flash('✅ Achievement created'); load()
    } catch (e: any) { flash('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  const toggle = async (id: string, isActive: boolean) => {
    try { await api.adminAchievements.toggle(id, !isActive); load() }
    catch (e: any) { flash('❌ ' + e.message) }
  }

  const CAT_COLORS: Record<string,string> = {
    study:'bg-blue-100 text-blue-700', streak:'bg-orange-100 text-orange-700',
    quiz:'bg-purple-100 text-purple-700', social:'bg-teal-100 text-teal-700',
    tier:'bg-yellow-100 text-yellow-700', challenge:'bg-indigo-100 text-indigo-700',
  }

  const condType = COND_TYPES.find(c => c.value === form.condition?.type)

  return (
    <div className="min-h-screen">
      <Header title="Achievements" subtitle="Create and manage study achievement badges" />
      <div className="p-6 space-y-5">
        {msg && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{msg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji:'🏅', label:'Total Achievements', value: list.length },
            { emoji:'✅', label:'Active',             value: list.filter(a => a.is_active).length },
            { emoji:'🏆', label:'Total Earned',       value: list.reduce((s:number, a:any) => s + (a.earned_count||0), 0) },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex items-center justify-between">
          <p className="font-semibold text-slate-800">All Achievements</p>
          <div className="flex gap-2">
            <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
            <button onClick={() => { setForm(emptyForm); setModal(true) }} className="btn-primary"><Plus size={14} /> New Achievement</button>
          </div>
        </div>

        {loading ? <div className="card p-12 text-center text-slate-400">Loading…</div> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map(ach => (
              <div key={ach.id} className={`card p-4 ${!ach.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{ach.emoji}</span>
                    <div>
                      <p className="font-bold text-slate-900">{ach.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[ach.category] || 'bg-slate-100 text-slate-600'}`}>{ach.category}</span>
                    </div>
                  </div>
                  <button onClick={() => toggle(ach.id, ach.is_active)} className={`text-xs px-2 py-1 rounded-lg ${ach.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {ach.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">{ach.description}</p>
                <div className="flex gap-3 mt-3 text-xs text-slate-500">
                  <span>🪙 +{ach.coins_reward}</span><span>⚡ +{ach.xp_reward} XP</span><span>👥 {ach.earned_count} earned</span>
                </div>
                <div className="text-xs bg-slate-50 rounded-lg p-2 mt-2">
                  <span className="text-slate-400">Condition: </span>
                  <span className="font-medium text-slate-700">{ach.condition?.type} {ach.condition?.threshold || ach.condition?.tier_key}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <p className="font-bold text-slate-900 text-lg">New Achievement</p>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Emoji</label><input value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})} className="input text-center text-2xl" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Key (unique)</label><input value={form.key} onChange={e => setForm({...form,key:e.target.value.toLowerCase().replace(/\s/g,'_')})} placeholder="e.g. first_hour" className="input" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="input" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form,category:e.target.value})} className="input">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Type</label>
                  <select value={form.condition.type} onChange={e => setForm({...form,condition:{...form.condition,type:e.target.value}})} className="input">
                    {COND_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              {form.condition.type === 'tier_reach' ? (
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Target Tier</label>
                  <select value={form.condition.tier_key||'gold'} onChange={e => setForm({...form,condition:{...form.condition,tier_key:e.target.value}})} className="input">
                    {TIER_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select></div>
              ) : (
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Threshold ({condType?.hint})</label>
                  <input type="number" min="1" value={form.condition.threshold||0} onChange={e => setForm({...form,condition:{...form.condition,threshold:+e.target.value}})} className="input" /></div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">Coins Reward</label><input type="number" min="0" value={form.coinsReward} onChange={e => setForm({...form,coinsReward:+e.target.value})} className="input" /></div>
                <div><label className="block text-xs font-semibold text-slate-700 mb-1">XP Reward</label><input type="number" min="0" value={form.xpReward} onChange={e => setForm({...form,xpReward:+e.target.value})} className="input" /></div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving…' : 'Create Achievement'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
