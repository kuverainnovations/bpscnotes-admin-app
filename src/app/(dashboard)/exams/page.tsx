'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, RefreshCw, X, GraduationCap, Loader2 } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const CATEGORIES = ['BPSC','Bihar State','Central Govt','Railways','Teaching','Defence','Banking','SSC']
const EMPTY_FORM = { name:'', fullName:'', category:'BPSC', emoji:'🎯', sortOrder:0 }

// Issue 4: Curated emoji grid — grouped and easy to pick
const EMOJI_GROUPS = [
  { label:'Study',    emojis:['🎯','📚','📝','📋','📊','📖','🎓','✏️','🏆','⭐'] },
  { label:'Govt',     emojis:['🏛️','⚖️','🛡️','🏅','🎖️','🌐','🏢','📜','🔏','🗳️'] },
  { label:'Subjects', emojis:['🗺️','💰','🔬','🌿','⚡','🧪','🧬','🌍','🏗️','⚙️'] },
  { label:'Bihar',    emojis:['🏔️','🌾','🦅','🐯','💎','🎪','🌸','🎭','🔱','🕌'] },
]

// Issue 3: NumInput — no default 0, shows placeholder
function NumInput({ value, onChange, placeholder='0' }: { value:number; onChange:(v:number)=>void; placeholder?:string }) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={0}
      onChange={e => { setRaw(e.target.value); const n=parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()) { setRaw(''); onChange(0) } }}/>
  )
}

export default function ExamsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(() => api.exams.list(), [])
  const exams: any[] = data?.exams || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.exams.update(editing.id, d) : api.exams.create(d),
    { onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Exam updated ✅' : 'Exam added ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: toggle } = useMutation(
    (id: string, isActive: boolean) => api.exams.update(id, { isActive }),
    { onSuccess: () => { refetch(); showToast('Status updated') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); setShowEmojiPicker(false) }
  const openEdit = (e: any) => {
    setEditing(e)
    setForm({ name:e.name, fullName:e.full_name, category:e.category, emoji:e.emoji, sortOrder:e.sort_order||0 })
    setShowModal(true); setShowEmojiPicker(false)
  }

  const byCategory = CATEGORIES.map(cat => ({ category:cat, items:exams.filter(e=>e.category===cat) })).filter(g=>g.items.length>0)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Exam Management" subtitle="Manage all supported exams visible in the mobile app" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji:'🎓', label:'Total Exams',    value:exams.length,                                         color:'text-slate-700', bg:'bg-slate-50' },
            { emoji:'✅', label:'Active',          value:exams.filter(e=>e.is_active).length,                 color:'text-green-700', bg:'bg-green-50' },
            { emoji:'👥', label:'Total Students', value:formatNumber(exams.reduce((a,e)=>a+parseInt(e.total_users||0),0)), color:'text-blue-700', bg:'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> Add Exam</button>
        </div>

        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
          <div className="space-y-6">
            {byCategory.map(group => (
              <div key={group.category}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{group.category}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.items.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map(exam => (
                    <div key={exam.id} className={`card p-4 hover:shadow-md transition-shadow ${!exam.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl shrink-0">
                          {exam.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{exam.name}</p>
                          <p className="text-xs text-slate-400 truncate">{exam.full_name}</p>
                        </div>
                        <span className={`badge shrink-0 ${exam.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {exam.is_active ? '● Active' : '○ Off'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-black text-slate-900">{formatNumber(parseInt(exam.total_users||0))}</p>
                          <p className="text-[10px] text-slate-400">Total Users</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-black text-blue-700">{formatNumber(parseInt(exam.active_users||0))}</p>
                          <p className="text-[10px] text-slate-400">Active</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(exam)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                          <Edit size={12}/> Edit
                        </button>
                        <button onClick={() => toggle(exam.id, !exam.is_active)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors
                            ${exam.is_active ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}>
                          {exam.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════ Modal ══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit Exam' : 'Add Exam'}</h3>
                <p className="text-white/60 text-xs mt-0.5">Exams appear in the mobile app's exam selector</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Issue 4: Emoji picker — click to open grid */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Exam Icon</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-14 h-14 rounded-2xl bg-brand-50 border-2 border-brand-200 flex items-center justify-center text-3xl hover:bg-brand-100 transition-colors shrink-0">
                    {form.emoji}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">{showEmojiPicker ? 'Click any emoji to select' : 'Click the icon to change'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Or type any emoji directly in the box</p>
                    <input value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})}
                      className="input w-full mt-2 text-center text-2xl" placeholder="Type emoji…" maxLength={2}/>
                  </div>
                </div>
                {showEmojiPicker && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    {EMOJI_GROUPS.map(g => (
                      <div key={g.label}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{g.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.emojis.map(e => (
                            <button key={e} onClick={() => { setForm({...form, emoji:e}); setShowEmojiPicker(false) }}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-colors hover:bg-white hover:shadow-sm
                                ${form.emoji===e ? 'bg-brand-100 ring-2 ring-brand-400' : ''}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Short Name * <span className="font-normal text-slate-400">(shown in app)</span></label>
                <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="input w-full" placeholder="e.g. BPSC 72nd CCE" autoFocus/>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Full Name *</label>
                <input value={form.fullName} onChange={e => setForm({...form,fullName:e.target.value})} className="input w-full" placeholder="Bihar Public Service Commission 72nd CCE"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                {/* Issue 3: sort order — no default 0 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Sort Order</label>
                  <NumInput value={form.sortOrder} onChange={v => setForm({...form,sortOrder:v})} placeholder="e.g. 1"/>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving||!form.name.trim()||!form.fullName.trim()}
                className="btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Update' : 'Add Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}