'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, Shield, CheckCircle, RefreshCw } from 'lucide-react'

const ALL_PERMISSIONS = [
  'dashboard', 'users', 'courses', 'notes', 'quizzes', 'current-affairs',
  'jobs', 'subscriptions', 'notifications', 'coins', 'study-rooms',
  'leaderboard', 'live-classes', 'certificates', 'banners', 'coupons',
  'reviews', 'settings', 'roles',
]

const EMPTY_FORM = { name: '', email: '', password: '', permissions: [] as string[] }

export default function RolesPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.adminUsers.list(), []
  )
  const admins: any[] = data?.admins || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.adminUsers.update(editing.id, d) : api.adminUsers.create(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Admin updated ✅' : 'Admin created ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.adminUsers.delete(id),
    { onSuccess: () => { refetch(); showToast('Admin deactivated') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (admin: any) => {
    setEditing(admin)
    setForm({ name: admin.name, email: admin.email, password: '', permissions: admin.permissions || [] })
    setShowModal(true)
  }

  const togglePerm = (perm: string) => {
    setForm((prev: any) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p: string) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  const toggleAll = () => {
    setForm((prev: any) => ({
      ...prev,
      permissions: prev.permissions.includes('all') ? [] : ['all'],
    }))
  }

  const handleSave = () => {
    const payload: any = { name: form.name, email: form.email, permissions: form.permissions }
    if (!editing && form.password) payload.password = form.password
    if (editing && form.password) payload.password = form.password
    save(payload)
  }

  const AVATAR_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#E67E22', '#E74C3C', '#1ABC9C']

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Admin Roles" subtitle="Manage admin accounts and their permissions" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{admins.length} admin account{admins.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
            <button onClick={openNew} className="btn-primary"><Plus size={14} />Add Admin</button>
          </div>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin, idx) => (
              <div key={admin.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                    >
                      {admin.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{admin.name}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                    </div>
                  </div>
                  <span className={`badge ${admin.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {admin.status}
                  </span>
                </div>

                {admin.last_login_at && (
                  <p className="text-xs text-slate-400 mb-3">
                    Last login: {new Date(admin.last_login_at).toLocaleDateString()}
                  </p>
                )}

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {admin.permissions?.includes('all') ? (
                      <span className="badge bg-brand-100 text-brand-700 border-brand-200">✓ All Permissions</span>
                    ) : (
                      admin.permissions?.slice(0, 6).map((p: string) => (
                        <span key={p} className="badge bg-slate-100 text-slate-600 border-slate-200 text-[10px]">{p}</span>
                      ))
                    )}
                    {!admin.permissions?.includes('all') && admin.permissions?.length > 6 && (
                      <span className="badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">+{admin.permissions.length - 6} more</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(admin)} className="btn-secondary text-xs flex-1"><Edit size={12} />Edit</button>
                  {admin.email !== 'admin@bpscnotes.com' && (
                    <button onClick={() => remove(admin.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 size={13} className="text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Permissions Reference */}
        <div className="card p-5">
          <h2 className="section-title">Permission Reference</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {ALL_PERMISSIONS.map(p => (
              <div key={p} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <CheckCircle size={12} className="text-brand-500 shrink-0" />
                <span className="text-xs text-slate-700 font-medium">{p}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Admin' : 'Add Admin Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="John Doe" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="admin@example.com" />
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" placeholder="Minimum 8 characters" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600">Permissions</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.permissions.includes('all')} onChange={toggleAll} />
                    <span className="text-xs text-slate-600 font-medium">All permissions</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={form.permissions.includes('all')}
                        checked={form.permissions.includes('all') || form.permissions.includes(p)}
                        onChange={() => togglePerm(p)}
                        className="rounded"
                      />
                      <span className="text-xs text-slate-700">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.email} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
