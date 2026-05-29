'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import {
  Plus, Edit, Trash2, Shield, CheckCircle, RefreshCw,
  Mail, Clock, AlertCircle, CheckCircle2, XCircle,
  Send, Eye, EyeOff, Copy, RotateCcw, ShieldCheck,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────
const ALL_PERMISSIONS = [
  'dashboard', 'users', 'courses', 'notes', 'quizzes', 'current-affairs',
  'jobs', 'subscriptions', 'notifications', 'coins', 'study-rooms',
  'leaderboard', 'live-classes', 'certificates', 'banners', 'coupons',
  'reviews', 'settings', 'roles',
]

const AVATAR_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#E67E22', '#E74C3C', '#1ABC9C']

const EMPTY_FORM = { name: '', email: '', password: '', permissions: [] as string[] }

// ── Status badge helper ────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: {
      label: 'Active',
      cls: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle2 size={11} />,
    },
    pending_verification: {
      label: 'Awaiting Email Verification',
      cls: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Clock size={11} />,
    },
    inactive: {
      label: 'Inactive',
      cls: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: <XCircle size={11} />,
    },
  }
  const { label, cls, icon } = map[status] ?? map.inactive
  return (
    <span className={`badge flex items-center gap-1 ${cls}`}>
      {icon} {label}
    </span>
  )
}

// ── Verification countdown pill ────────────────────────────
function VerificationTimer({ expiresAt }: { expiresAt?: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!expiresAt) return null
  const expired = timeLeft === 'Expired'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
      ${expired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
      <Clock size={9} />
      {expired ? 'Link expired' : `Link expires in ${timeLeft}`}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────
export default function RolesPage() {
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<any>(null)
  const [form, setForm]                 = useState<any>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep]                 = useState<'form' | 'sent'>('form')
  const [createdAdmin, setCreatedAdmin] = useState<any>(null)
  const [resending, setResending]       = useState<string | null>(null)
  const { showToast, ToastComponent }   = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.adminUsers.list(), []
  )
  const admins: any[] = data?.admins || []

  const pending = admins.filter(a => a.status === 'pending_verification')
  const active  = admins.filter(a => a.status === 'active')

  // ── Mutations ──────────────────────────────────────────
  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing
      ? api.adminUsers.update(editing.id, d)
      : api.adminUsers.create(d),
    {
      onSuccess: (res: any) => {
        if (!editing) {
          // New admin — show email-sent confirmation step
          setCreatedAdmin(res?.data?.admin ?? { email: form.email, name: form.name })
          setStep('sent')
          refetch()
        } else {
          setShowModal(false)
          refetch()
          showToast('Admin updated ✅')
        }
      },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.adminUsers.delete(id),
    { onSuccess: () => { refetch(); showToast('Admin removed') }, onError: (m) => showToast(m, 'error') }
  )

  // ── Resend verification ────────────────────────────────
  const resendVerification = async (adminId: string) => {
    setResending(adminId)
    try {
      await api.adminUsers.resendVerification(adminId)
      showToast('Verification email resent ✅')
      refetch()
    } catch (e: any) {
      showToast(e.message || 'Failed to resend', 'error')
    } finally {
      setResending(null)
    }
  }

  // ── Manually approve (skip email) ─────────────────────
  const manualApprove = async (adminId: string) => {
    if (!confirm('Manually approve this admin without email verification?')) return
    try {
      await api.adminUsers.approve(adminId)
      showToast('Admin approved manually ✅')
      refetch()
    } catch (e: any) {
      showToast(e.message || 'Failed to approve', 'error')
    }
  }

  // ── Form helpers ───────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setStep('form')
    setCreatedAdmin(null)
    setShowModal(true)
  }
  const openEdit = (admin: any) => {
    setEditing(admin)
    setForm({ name: admin.name, email: admin.email, password: '', permissions: admin.permissions || [] })
    setStep('form')
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setStep('form'); setCreatedAdmin(null) }

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

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) { showToast('Name and email are required', 'error'); return }
    if (!editing && !form.password) { showToast('Password is required', 'error'); return }
    if (!editing && form.password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return }
    const payload: any = { name: form.name, email: form.email, permissions: form.permissions }
    if (form.password) payload.password = form.password
    save(payload)
  }

  // ── Copy helper ────────────────────────────────────────
  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Admin Roles" subtitle="Manage admin accounts and access permissions" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* ── Summary bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle2 size={13} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">{active.length} Active</span>
            </div>
            {pending.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 animate-pulse">
                <Clock size={13} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">{pending.length} Awaiting Verification</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
            <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Admin</button>
          </div>
        </div>

        {/* ── Pending verification banner ── */}
        {pending.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">
                  {pending.length} admin{pending.length > 1 ? 's' : ''} waiting to verify their email
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These accounts have limited access until the admin verifies their email address.
                  You can resend the link or manually approve.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Admin cards ── */}
        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin, idx) => (
              <div key={admin.id}
                className={`card p-5 transition-all ${admin.status === 'pending_verification'
                  ? 'border-2 border-amber-200 bg-amber-50/30'
                  : ''}`}
              >
                {/* Avatar + name row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 relative ${admin.status === 'pending_verification' ? 'opacity-60' : ''}`}
                      style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                    >
                      {admin.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      {admin.status === 'pending_verification' && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                          <Clock size={9} className="text-white" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{admin.name}</p>
                      <p className="text-xs text-slate-400 break-all">{admin.email}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-3">
                  <StatusBadge status={admin.status} />
                  {admin.status === 'pending_verification' && (
                    <div className="mt-1.5">
                      <VerificationTimer expiresAt={admin.verification_expires_at} />
                    </div>
                  )}
                </div>

                {/* Last login */}
                {admin.last_login_at && admin.status === 'active' && (
                  <p className="text-xs text-slate-400 mb-3">
                    Last login: {new Date(admin.last_login_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                )}

                {/* Permissions */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {admin.permissions?.includes('all') ? (
                      <span className="badge bg-brand-100 text-brand-700 border-brand-200 flex items-center gap-1">
                        <ShieldCheck size={10} /> All Permissions
                      </span>
                    ) : (
                      admin.permissions?.slice(0, 5).map((p: string) => (
                        <span key={p} className="badge bg-slate-100 text-slate-600 border-slate-200 text-[10px]">{p}</span>
                      ))
                    )}
                    {!admin.permissions?.includes('all') && admin.permissions?.length > 5 && (
                      <span className="badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                        +{admin.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {admin.status === 'pending_verification' ? (
                    <>
                      <button
                        onClick={() => resendVerification(admin.id)}
                        disabled={resending === admin.id}
                        className="btn-secondary text-xs flex-1 flex items-center gap-1.5"
                      >
                        {resending === admin.id
                          ? <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Sending...</>
                          : <><Send size={11} /> Resend Link</>
                        }
                      </button>
                      <button
                        onClick={() => manualApprove(admin.id)}
                        className="btn-secondary text-xs flex items-center gap-1.5 px-3"
                        title="Manually approve without email verification"
                      >
                        <ShieldCheck size={11} className="text-green-600" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => openEdit(admin)} className="btn-secondary text-xs flex-1 flex items-center gap-1.5">
                      <Edit size={12} /> Edit
                    </button>
                  )}
                  {admin.email !== 'admin@bpscnotes.com' && (
                    <button
                      onClick={() => remove(admin.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Trash2 size={13} className="text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Permission reference ── */}
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2">
            <Shield size={16} className="text-brand-500" /> Permission Reference
          </h2>
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

      {/* ══════════════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-hidden"
            onClick={e => e.stopPropagation()}
          >

            {/* ── Step 1: Form ── */}
            {step === 'form' && (
              <>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'DM Serif Display,serif' }}>
                      {editing ? 'Edit Admin' : 'Add Sub-Admin'}
                    </h3>
                    {!editing && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        A verification email will be sent to the provided address
                      </p>
                    )}
                  </div>
                  <button onClick={closeModal} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">

                  {/* Email verification notice for new admin */}
                  {!editing && (
                    <div className="flex items-start gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                      <Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900">Email verification required</p>
                        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                          After creation, a secure verification link will be sent to the admin's email.
                          They must click it within <strong>24 hours</strong> to activate their account.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Name + Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="input"
                        placeholder="John Doe"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="input"
                        placeholder="admin@example.com"
                        disabled={!!editing}
                      />
                      {editing && (
                        <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed after creation</p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {editing ? 'New Password (leave blank to keep)' : 'Temporary Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="input pr-10"
                        placeholder={editing ? '••••••••' : 'Min. 8 characters'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {!editing && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        The admin will use this to log in after email verification.
                      </p>
                    )}
                  </div>

                  {/* Permissions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-600">Permissions</label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes('all')}
                          onChange={toggleAll}
                          className="rounded"
                        />
                        <span className="text-xs text-slate-600 font-medium">Grant all permissions</span>
                      </label>
                    </div>
                    {form.permissions.includes('all') && (
                      <div className="mb-2 flex items-center gap-2 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
                        <ShieldCheck size={14} className="text-brand-600 shrink-0" />
                        <p className="text-xs text-brand-700">
                          This admin will have full access to all modules including sensitive settings.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_PERMISSIONS.map(p => (
                        <label
                          key={p}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                            ${form.permissions.includes(p) || form.permissions.includes('all')
                              ? 'bg-brand-50 border border-brand-100'
                              : 'hover:bg-slate-50 border border-transparent'
                            }`}
                        >
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

                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                  <button onClick={closeModal} className="btn-secondary">Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim() || !form.email.trim() || (!editing && !form.password)}
                    className="btn-primary disabled:opacity-40 flex items-center gap-2"
                  >
                    {saving ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending invite…</>
                    ) : editing ? (
                      'Update Admin'
                    ) : (
                      <><Mail size={14} /> Create & Send Verification</>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Email Sent confirmation ── */}
            {step === 'sent' && createdAdmin && (
              <div className="p-8 text-center">
                {/* Animated success icon */}
                <div className="w-20 h-20 mx-auto mb-5 relative">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <Mail size={36} className="text-green-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'DM Serif Display,serif' }}>
                  Verification Email Sent!
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Account created for <strong className="text-slate-800">{createdAdmin.name}</strong>
                </p>

                {/* Email pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl mb-6 max-w-full">
                  <Mail size={14} className="text-slate-500 shrink-0" />
                  <span className="text-sm font-mono text-slate-700 truncate">{createdAdmin.email}</span>
                  <button
                    onClick={() => copy(createdAdmin.email)}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    <Copy size={13} />
                  </button>
                </div>

                {/* Steps */}
                <div className="text-left space-y-3 mb-7 bg-slate-50 rounded-2xl p-4">
                  {[
                    { icon: '📬', text: 'Verification email sent to their inbox' },
                    { icon: '🔗', text: 'They click the secure link in the email' },
                    { icon: '✅', text: 'Account activates — they can now log in' },
                    { icon: '⏰', text: 'Link expires in 24 hours — you can resend anytime' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <p className="text-xs text-slate-600">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const admin = admins.find(a => a.email === createdAdmin.email)
                      if (admin) resendVerification(admin.id)
                    }}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <RotateCcw size={13} /> Resend Email
                  </button>
                  <button onClick={closeModal} className="btn-primary flex-1 text-sm">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
