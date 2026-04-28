'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, Tag, Copy, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const EMPTY_FORM = { code: '', type: 'flat', value: 0, description: '', appliesTo: 'both', maxUses: '', expiresAt: '' }

export default function CouponsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.subscriptions.getCoupons(), []
  )
  const coupons: any[] = data?.coupons || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.subscriptions.updateCoupon(editing.id, d) : api.subscriptions.createCoupon(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Coupon updated ✅' : 'Coupon created — active now ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.subscriptions.deleteCoupon(id),
    { onSuccess: () => { refetch(); showToast('Coupon deleted') }, onError: (m) => showToast(m, 'error') }
  )

  const { mutate: toggle } = useMutation(
    (id: string, isActive: boolean) => api.subscriptions.updateCoupon(id, { isActive }),
    { onSuccess: () => { refetch(); showToast('Status toggled ✅') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ code: c.code, type: c.type, value: c.value, description: c.description, appliesTo: c.applies_to, maxUses: c.max_uses || '', expiresAt: c.expires_at ? c.expires_at.split('T')[0] : '' })
    setShowModal(true)
  }

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code)
    showToast(`Copied: ${code}`)
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coupon Codes" subtitle="Manage discount coupons for subscriptions and courses" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Coupons', value: coupons.length, emoji: '🏷️' },
            { label: 'Active',        value: coupons.filter(c => c.is_active).length, emoji: '✅' },
            { label: 'Total Used',    value: formatNumber(coupons.reduce((a, c) => a + (c.used_count || 0), 0)), emoji: '📊' },
            { label: 'Expiring Soon', value: coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length, emoji: '⏰' },
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
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Create Coupon</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="space-y-3">
            {coupons.map(coupon => {
              const usePct = coupon.max_uses ? Math.round((coupon.used_count || 0) / coupon.max_uses * 100) : 0
              return (
                <div key={coupon.id} className="card p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                        <Tag size={18} className="text-yellow-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-slate-900 text-lg">{coupon.code}</code>
                          <button onClick={() => copy(coupon.code)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <Copy size={11} className="text-slate-500" />
                          </button>
                          <span className={`badge ${coupon.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="badge bg-blue-50 text-blue-600 border-blue-100">{coupon.applies_to}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{coupon.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">
                          {coupon.type === 'flat' ? `₹${coupon.value} off` : `${coupon.value}% off`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {coupon.expires_at ? `Expires: ${new Date(coupon.expires_at).toLocaleDateString()}` : 'No expiry'}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => toggle(coupon.id, !coupon.is_active)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${coupon.is_active ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'}`}>
                          <span className="text-xs">{coupon.is_active ? '🔴' : '🟢'}</span>
                        </button>
                        <button onClick={() => openEdit(coupon)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center">
                          <Edit size={13} className="text-yellow-600" />
                        </button>
                        <button onClick={() => remove(coupon.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                          <Trash2 size={13} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {coupon.max_uses && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500">Usage: {formatNumber(coupon.used_count || 0)} / {formatNumber(coupon.max_uses)}</span>
                        <span className="text-xs font-semibold text-slate-700">{usePct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${usePct}%`, background: usePct > 80 ? '#ef4444' : usePct > 50 ? '#f59e0b' : '#10b981' }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {coupons.length === 0 && (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-3">🏷️</p>
                <p className="font-bold text-slate-800">No coupons yet</p>
                <p className="text-slate-400 text-sm mt-1">Create your first coupon code</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Coupon' : 'Create Coupon Code'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Coupon Code *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input font-mono uppercase" placeholder="e.g. BIHAR25" disabled={!!editing} />
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" placeholder="Brief description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                    <option value="flat">Flat (₹)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Value *</label>
                  <input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} className="input" placeholder={form.type === 'flat' ? '100' : '10'} />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} className="input" placeholder="Leave empty = unlimited" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Expires At</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="input" />
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Applies To</label>
                <select value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value })} className="input">
                  <option value="both">Both</option>
                  <option value="subscription">Subscription only</option>
                  <option value="course">Course only</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save({ ...form, maxUses: form.maxUses ? Number(form.maxUses) : null, expiresAt: form.expiresAt || null })}
                disabled={saving || !form.code || !form.value} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
