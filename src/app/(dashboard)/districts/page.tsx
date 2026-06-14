'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, RefreshCw, X, MapPin, Loader2, Trash2 } from 'lucide-react'

const EMPTY_FORM = { name: '', state: 'Bihar', sortOrder: 0 }

function NumInput({ value, onChange, placeholder = '0' }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={0}
      onChange={e => { setRaw(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()) { setRaw(''); onChange(0) } }} />
  )
}

export default function DistrictsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(() => api.districts.list(), [])
  const districts: any[] = data?.districts || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.districts.update(editing.id, d) : api.districts.create(d),
    { onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'District updated ✅' : 'District added ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: toggle } = useMutation(
    (id: string, isActive: boolean) => api.districts.update(id, { isActive }),
    { onSuccess: () => { refetch(); showToast('Status updated') }, onError: (m) => showToast(m, 'error') }
  )
  const { mutate: remove } = useMutation(
    (id: string) => api.districts.delete(id),
    { onSuccess: () => { refetch(); showToast('District removed') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (d: any) => {
    setEditing(d)
    setForm({ name: d.name, state: d.state, sortOrder: d.sort_order || 0 })
    setShowModal(true)
  }

  // Group by state — almost always just "Bihar", but supports expansion
  const byState = Array.from(new Set(districts.map(d => d.state))).sort().map(state => ({
    state, items: districts.filter(d => d.state === state)
  }))

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Districts" subtitle="Manage the district list shown during profile creation" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 flex items-center gap-3 bg-slate-50">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-2xl font-black text-slate-700">{districts.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total Districts</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 bg-green-50">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-2xl font-black text-green-700">{districts.filter(d => d.is_active).length}</p>
              <p className="text-xs text-slate-500 font-medium">Visible in app</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add District</button>
        </div>

        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
          <div className="space-y-6">
            {byState.map(group => (
              <div key={group.state}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{group.state}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.items.length}</span>
                </div>
                <div className="card overflow-hidden divide-y divide-slate-100">
                  {group.items.map(d => (
                    <div key={d.id} className={`flex items-center gap-3 px-4 py-2.5 ${!d.is_active ? 'opacity-50' : ''}`}>
                      <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-brand-600" />
                      </div>
                      <p className="flex-1 font-semibold text-slate-800 text-sm truncate">{d.name}</p>
                      <span className="text-[11px] text-slate-400 shrink-0">#{d.sort_order}</span>
                      <span className={`badge shrink-0 ${d.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {d.is_active ? '● Active' : '○ Off'}
                      </span>
                      <button onClick={() => openEdit(d)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0" title="Edit">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => toggle(d.id, !d.is_active)}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${d.is_active ? 'bg-amber-50 hover:bg-amber-100 text-amber-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}
                        title={d.is_active ? 'Hide from app' : 'Show in app'}>
                        {d.is_active ? '○' : '●'}
                      </button>
                      <button onClick={() => { if (confirm(`Delete "${d.name}"? This can't be undone.`)) remove(d.id) }}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors shrink-0" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {group.items.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-6">No districts yet</p>
                  )}
                </div>
              </div>
            ))}
            {districts.length === 0 && (
              <div className="card p-8 text-center text-slate-400 text-sm">No districts configured yet — add one to get started.</div>
            )}
          </div>
        )}
      </div>

      {/* ══════ Modal ══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit District' : 'Add District'}</h3>
                <p className="text-white/60 text-xs mt-0.5">Shown in the profile-creation district dropdown</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">District Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input w-full" placeholder="e.g. Patna" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">State</label>
                  <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="input w-full" placeholder="Bihar" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Sort Order</label>
                  <NumInput value={form.sortOrder} onChange={v => setForm({ ...form, sortOrder: v })} placeholder="e.g. 1" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving || !form.name.trim()}
                className="btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editing ? 'Update' : 'Add District'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
