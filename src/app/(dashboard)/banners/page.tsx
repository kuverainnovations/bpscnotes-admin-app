'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const BG_GRADIENTS = [
  'from-blue-600 to-blue-800', 'from-yellow-500 to-orange-500',
  'from-purple-600 to-purple-800', 'from-green-600 to-teal-600',
  'from-red-500 to-pink-600', 'from-indigo-500 to-blue-600',
]

const EMPTY_FORM = {
  title: '', subtitle: '', actionLink: '', type: 'promotion',
  target: 'all', bgGradient: BG_GRADIENTS[0], sortOrder: 0,
}

export default function BannersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.banners.list(), []
  )
  const banners: any[] = data?.banners || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.banners.update(editing.id, d) : api.banners.create(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Banner updated ✅' : 'Banner created — live in app ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.banners.delete(id),
    { onSuccess: () => { refetch(); showToast('Banner deleted') }, onError: (m) => showToast(m, 'error') }
  )

  const { mutate: toggle } = useMutation(
    (id: string, isActive: boolean) => api.banners.update(id, { isActive }),
    { onSuccess: () => { refetch(); showToast('Banner toggled ✅') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (b: any) => {
    setEditing(b)
    setForm({ title: b.title, subtitle: b.subtitle || '', actionLink: b.action_link || '', type: b.type, target: b.target, bgGradient: b.bg_gradient || BG_GRADIENTS[0], sortOrder: b.sort_order || 0 })
    setShowModal(true)
  }

  const totalImpressions = banners.reduce((a, b) => a + (b.impression_count || 0), 0)
  const totalClicks = banners.reduce((a, b) => a + (b.click_count || 0), 0)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Banners & Promotions" subtitle="Manage home screen banners" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Banners', value: banners.length, emoji: '🖼️' },
            { label: 'Active',        value: banners.filter(b => b.is_active).length, emoji: '✅' },
            { label: 'Total Views',   value: formatNumber(totalImpressions), emoji: '👁️' },
            { label: 'Total Clicks',  value: formatNumber(totalClicks), emoji: '👆' },
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
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Add Banner</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map(banner => {
              const ctr = banner.impression_count > 0
                ? ((banner.click_count || 0) / banner.impression_count * 100).toFixed(1) : '0'
              return (
                <div key={banner.id} className="card overflow-hidden">
                  <div className={`bg-gradient-to-br ${banner.bg_gradient || 'from-blue-600 to-blue-800'} p-5 relative`}>
                    {!banner.is_active && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="badge bg-black/80 text-white border-transparent text-sm">INACTIVE</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <span className="badge bg-white/80 text-slate-800 border-transparent text-[10px]">{banner.type}</span>
                      <span className="badge bg-white/20 text-white border-white/20 text-[10px]">📍 {banner.target}</span>
                    </div>
                    <h3 className="font-bold text-white text-lg leading-tight">{banner.title}</h3>
                    {banner.subtitle && <p className="text-white/80 text-sm mt-1">{banner.subtitle}</p>}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                      <span>👆 {formatNumber(banner.click_count || 0)} clicks · 👁 {formatNumber(banner.impression_count || 0)} views</span>
                      <span className="font-bold text-slate-800">CTR: {ctr}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggle(banner.id, !banner.is_active)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${banner.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {banner.is_active ? <><EyeOff size={11} />Hide</> : <><Eye size={11} />Show</>}
                      </button>
                      <button onClick={() => openEdit(banner)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-600 text-xs font-semibold transition-all">
                        <Edit size={11} />Edit
                      </button>
                      <button onClick={() => remove(banner.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                        <Trash2 size={13} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {banners.length === 0 && (
              <div className="col-span-3 card p-12 text-center">
                <p className="text-4xl mb-3">🖼️</p>
                <p className="font-bold text-slate-800">No banners yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Banner' : 'Add Banner'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {/* Live preview */}
              <div className={`bg-gradient-to-br ${form.bgGradient} p-4 rounded-xl`}>
                <h3 className="font-bold text-white">{form.title || 'Banner Preview'}</h3>
                <p className="text-white/80 text-sm mt-1">{form.subtitle || 'Subtitle preview'}</p>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Headline *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Banner headline" />
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subtitle</label>
                <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="input" placeholder="Short description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                    <option value="promotion">promotion</option>
                    <option value="course">course</option>
                    <option value="quiz">quiz</option>
                    <option value="job">job</option>
                    <option value="content">content</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Target</label>
                  <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="input">
                    <option value="all">all</option>
                    <option value="BPSC 70th CCE">BPSC 70th CCE</option>
                    <option value="Bihar Police SI">Bihar Police SI</option>
                    <option value="SSC CGL">SSC CGL</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Background Gradient</label>
                <div className="grid grid-cols-3 gap-2">
                  {BG_GRADIENTS.map(g => (
                    <button key={g} onClick={() => setForm({ ...form, bgGradient: g })}
                      className={`h-8 rounded-lg bg-gradient-to-r ${g} border-2 transition-all ${form.bgGradient === g ? 'border-slate-900' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Action Link</label>
                <input value={form.actionLink} onChange={e => setForm({ ...form, actionLink: e.target.value })} className="input" placeholder="/subscription or /courses" />
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving || !form.title} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
