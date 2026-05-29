'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import {
  Plus, Edit, Trash2, Shield, CheckCircle, RefreshCw,
  Eye, EyeOff, ShieldCheck, ShieldAlert, User,
  Lock, Unlock, Crown, X,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'dashboard', 'users', 'courses', 'notes', 'quizzes', 'current-affairs',
  'jobs', 'subscriptions', 'notifications', 'coins', 'study-rooms',
  'leaderboard', 'live-classes', 'certificates', 'banners', 'coupons',
  'reviews', 'settings', 'roles',
]

const PERM_META: Record<string, { icon: string; color: string; bg: string }> = {
  dashboard:        { icon: '📊', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  users:            { icon: '👥', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  courses:          { icon: '📚', color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  notes:            { icon: '📝', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  quizzes:          { icon: '❓', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'current-affairs':{ icon: '📰', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  jobs:             { icon: '💼', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  subscriptions:    { icon: '💳', color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-200' },
  notifications:    { icon: '🔔', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  coins:            { icon: '🪙', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  'study-rooms':    { icon: '🏫', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  leaderboard:      { icon: '🏆', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  'live-classes':   { icon: '📡', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  certificates:     { icon: '🎓', color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  banners:          { icon: '🖼️', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  coupons:          { icon: '🎟️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  reviews:          { icon: '⭐', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  settings:         { icon: '⚙️', color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
  roles:            { icon: '🛡️', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
}

const AVATAR_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#E67E22', '#E74C3C', '#1ABC9C', '#F39C12', '#8E44AD']
const EMPTY_FORM    = { name: '', email: '', password: '', permissions: [] as string[] }

// ── Main page ────────────────────────────────────────────────
export default function RolesPage() {
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<any>(null)
  const [form, setForm]                 = useState<any>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const { showToast, ToastComponent }   = useToast()

  // Issue 2: using useApiData so refetch works properly
  const { data, loading, error, refetch } = useApiData<any>(
    () => api.adminUsers.list(), []
  )
  const admins: any[] = data?.admins || []

  // Issue 2 + 3: create — activate immediately (no email verification)
  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing
      ? api.adminUsers.update(editing.id, d)
      : api.adminUsers.create(d),
    {
      onSuccess: () => {
        setShowModal(false)
        setEditing(null)
        setForm(EMPTY_FORM)
        refetch()   // Issue 2: refetch right after create/update
        showToast(editing ? 'Admin updated ✅' : 'Admin created & activated ✅')
      },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.adminUsers.delete(id),
    {
      onSuccess: () => { refetch(); showToast('Admin removed') },
      onError:   (m) => showToast(m, 'error'),
    }
  )

  // ── Helpers ────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setShowModal(true)
  }
  const openEdit = (admin: any) => {
    setEditing(admin)
    setForm({ name: admin.name, email: admin.email, password: '', permissions: admin.permissions || [] })
    setShowPassword(false)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM) }

  const togglePerm = (perm: string) =>
    setForm((p: any) => ({
      ...p,
      permissions: p.permissions.includes(perm)
        ? p.permissions.filter((x: string) => x !== perm)
        : [...p.permissions, perm],
    }))

  const toggleAll = () =>
    setForm((p: any) => ({
      ...p,
      permissions: p.permissions.includes('all') ? [] : ['all'],
    }))

  // Issue 3: no email verification — create as active directly
  const handleSave = () => {
    if (!form.name.trim())  { showToast('Name is required', 'error'); return }
    if (!form.email.trim()) { showToast('Email is required', 'error'); return }
    if (!editing && !form.password)       { showToast('Password is required', 'error'); return }
    if (!editing && form.password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return }

    const payload: any = {
      name:        form.name,
      email:       form.email,
      permissions: form.permissions,
      status:      'active',   // Issue 3: activate immediately, skip email verification
    }
    if (form.password) payload.password = form.password
    save(payload)
  }

  // Stats
  const active   = admins.filter(a => a.status === 'active').length
  const inactive = admins.filter(a => a.status === 'inactive').length

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Admin Roles" subtitle="Manage admin accounts and permissions" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Stats row ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Admins',   value: admins.length, icon: <User size={20} />,      bg: 'from-blue-500 to-blue-600' },
            { label: 'Active',         value: active,        icon: <Unlock size={20} />,     bg: 'from-green-500 to-green-600' },
            { label: 'Inactive',       value: inactive,      icon: <Lock size={20} />,       bg: 'from-slate-400 to-slate-500' },
          ].map(s => (
            <div key={s.label} className="card p-5 flex items-center gap-4 overflow-hidden relative">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-white shadow-lg shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Admin cards grid ─────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Admin Accounts</h2>
          <div className="flex gap-2">
            <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
            <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Admin</button>
          </div>
        </div>

        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {admins.map((admin, idx) => {
              const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length]
              const initials = admin.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'SA'
              const isSuper  = admin.permissions?.includes('all')
              const permCount = admin.permissions?.length || 0

              return (
                <div key={admin.id}
                  className="card p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar with status ring */}
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                        >
                          {initials}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white
                          ${admin.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900">{admin.name}</p>
                          {isSuper && <Crown size={12} className="text-amber-500" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{admin.email}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`badge text-[10px] ${
                      admin.status === 'active'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {admin.status === 'active' ? '● Active' : '○ Inactive'}
                    </span>
                  </div>

                  {/* Permissions */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Permissions</p>
                    {isSuper ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <Crown size={13} className="text-amber-500 shrink-0" />
                        <p className="text-xs font-bold text-amber-700">Full Access — All Permissions</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {admin.permissions?.slice(0, 6).map((p: string) => {
                          const meta = PERM_META[p]
                          return (
                            <span key={p} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${meta?.bg || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                              <span>{meta?.icon || '•'}</span>
                              <span className={meta?.color || 'text-slate-600'}>{p}</span>
                            </span>
                          )
                        })}
                        {permCount > 6 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            +{permCount - 6} more
                          </span>
                        )}
                        {permCount === 0 && (
                          <span className="text-xs text-slate-400 italic">No permissions</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last login */}
                  {admin.last_login_at && (
                    <p className="text-[10px] text-slate-400">
                      Last login: {new Date(admin.last_login_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={() => openEdit(admin)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Edit size={12} /> Edit
                    </button>
                    {admin.email !== 'admin@bpscnotes.com' && (
                      <button
                        onClick={() => {
                          if (!confirm(`Remove admin "${admin.name}"? They will lose all access.`)) return
                          remove(admin.id)
                        }}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors group/del"
                        title="Remove admin"
                      >
                        <Trash2 size={13} className="text-red-500 group-hover/del:text-red-700" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add new card placeholder */}
            <button
              onClick={openNew}
              className="border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all group min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                <Plus size={22} className="text-slate-400 group-hover:text-brand-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400 group-hover:text-brand-600 transition-colors">Add Sub-Admin</p>
            </button>
          </div>
        )}

        {/* ── Permission reference ─────────────────────────── */}
        <details className="card overflow-hidden">
          <summary className="px-5 py-4 flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Shield size={16} className="text-brand-500" />
            Permission Reference
            <span className="ml-auto text-xs text-slate-400 font-normal">{ALL_PERMISSIONS.length} available</span>
          </summary>
          <div className="px-5 pb-5 pt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 border-t border-slate-100">
            {ALL_PERMISSIONS.map(p => {
              const meta = PERM_META[p]
              return (
                <div key={p} className={`flex items-center gap-2 p-2.5 rounded-xl border ${meta?.bg || 'bg-slate-50 border-slate-200'}`}>
                  <span>{meta?.icon || '•'}</span>
                  <span className={`text-xs font-semibold ${meta?.color || 'text-slate-600'}`}>{p}</span>
                </div>
              )
            })}
          </div>
        </details>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL — create / edit admin
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  {editing ? <Edit size={16} className="text-white" /> : <Plus size={16} className="text-white" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-none">
                    {editing ? 'Edit Admin' : 'Add Sub-Admin'}
                  </h3>
                  <p className="text-white/60 text-xs mt-1">
                    {editing ? 'Update account details and permissions' : 'Account activated immediately — no email needed'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">

              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="John Doe"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input"
                    placeholder="admin@example.com"
                    disabled={!!editing}
                  />
                  {editing && <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  {editing ? 'New Password (leave blank to keep)' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="input pr-10"
                    placeholder={editing ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-600">Permissions</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      className={`w-8 h-4 rounded-full transition-colors relative ${form.permissions.includes('all') ? 'bg-brand-500' : 'bg-slate-200'}`}
                      onClick={toggleAll}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.permissions.includes('all') ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">All permissions</span>
                  </label>
                </div>

                {form.permissions.includes('all') ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5">
                    <Crown size={16} className="text-amber-500 shrink-0" />
                    <p className="text-xs font-semibold text-amber-700">
                      This admin will have full access to all modules
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {ALL_PERMISSIONS.map(p => {
                      const meta    = PERM_META[p]
                      const checked = form.permissions.includes(p)
                      return (
                        <label
                          key={p}
                          className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border
                            ${checked ? `${meta?.bg || 'bg-brand-50 border-brand-200'}` : 'border-transparent hover:bg-slate-50'}`}
                        >
                          <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors shrink-0
                            ${checked ? 'bg-brand-500 border-brand-500' : 'border-slate-300'}`}>
                            {checked && <CheckCircle size={10} className="text-white" />}
                          </div>
                          <span>{meta?.icon || '•'}</span>
                          <span className={`text-xs font-medium ${checked ? (meta?.color || 'text-brand-700') : 'text-slate-600'}`}>{p}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {!form.permissions.includes('all') && form.permissions.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">{form.permissions.length} permission{form.permissions.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim() || (!editing && !form.password)}
                className="btn-primary disabled:opacity-40"
              >
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : editing ? 'Update Admin' : 'Create Admin'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}