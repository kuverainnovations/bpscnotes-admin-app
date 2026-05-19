'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, RefreshCw } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'
import { formatNumber } from '@/lib/utils'

const EMPTY_FORM = { name: '', fullName: '', category: 'BPSC', emoji: '🎯', sortOrder: 0 }
const CATEGORIES = ['BPSC', 'Bihar State', 'Central Govt', 'Railways', 'Teaching', 'Defence']

export default function ExamsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.exams.list(), []
  )
  const exams: any[] = data?.exams || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.exams.update(editing.id, d) : api.exams.create(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Exam updated ✅' : 'Exam added ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: toggle } = useMutation(
    (id: string, isActive: boolean) => api.exams.update(id, { isActive }),
    { onSuccess: () => { refetch(); showToast('Status updated ✅') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (exam: any) => {
    setEditing(exam)
    setForm({ name: exam.name, fullName: exam.full_name, category: exam.category, emoji: exam.emoji, sortOrder: exam.sort_order })
    setShowModal(true)
  }

  const byCategory = CATEGORIES.map(cat => ({
    category: cat,
    items: exams.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Exam Management" subtitle="Manage all supported exams — visible in mobile app selection" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Exams',    value: exams.length,                           emoji: '🎓' },
            { label: 'Active',         value: exams.filter(e => e.is_active).length,  emoji: '✅' },
            { label: 'Total Students', value: formatNumber(exams.reduce((a, e) => a + parseInt(e.total_users || 0), 0)), emoji: '👥' },
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

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Add Exam</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="space-y-6">
            {byCategory.map(group => (
              <div key={group.category}>
                <h2 className="section-title">{group.category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map(exam => (
                    <div key={exam.id} className="card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{exam.emoji}</span>
                          <div>
                            <p className="font-bold text-slate-900">{exam.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[160px]">{exam.full_name}</p>
                          </div>
                        </div>
                        <span className={`badge ${exam.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {exam.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-slate-900">{formatNumber(parseInt(exam.total_users || 0))}</p>
                          <p className="text-xs text-slate-400">Total Users</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-blue-700">{formatNumber(parseInt(exam.active_users || 0))}</p>
                          <p className="text-xs text-slate-400">Active</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(exam)} className="btn-secondary text-xs flex-1"><Edit size={12} />Edit</button>
                        <button
                          onClick={() => toggle(exam.id, !exam.is_active)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${exam.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Exam' : 'Add Exam'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Short Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. BPSC 72nd CCE" />
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="input" placeholder="Bihar Public Service Commission 72nd CCE" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <DynamicSelect type="exam-categories" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="Select category…" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Emoji</label>
                  <select value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="input text-xl">
                    {['🎯','📚','⚖️','🏛️','🗺️','💰','🔬','🏔️','📝','🎓','⭐','🏆','📊','🎪','🌿','🛡️','⚡','🎭','🌍','🏛','📋'].map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving || !form.name || !form.fullName} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
