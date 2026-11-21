'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  Plus, Pencil, Trash2, Package, Layers, Coins, IndianRupee, Check, X, Search,
} from 'lucide-react'

// A bundle of mock tests sold once, the way a course is. Owning the
// package unlocks every test inside it. Individual test prices still work
// — a test can carry its own price as well, and owning either grants
// access, so nothing already selling had to change.

interface QuizPackage {
  id: string
  title: string
  description?: string | null
  thumbnail_url?: string | null
  subject?: string | null
  exam_tags?: string[]
  is_paid: boolean
  price: number
  coin_price: number
  status: string
  sort_order: number
  gplay_product_id?: string | null
  test_count?: number
  purchase_count?: number
}

interface QuizRow {
  id: string
  title: string
  type?: string
  subject?: string
  status?: string
  total_questions?: number
  package_id?: string | null
}

const EMPTY = {
  title: '', description: '', thumbnailUrl: '', subject: '',
  isPaid: true, price: 0, coinPrice: 0, status: 'draft', sortOrder: 0,
}

export default function QuizPackagesPage() {
  const { showToast, ToastComponent } = useToast()

  const [packages, setPackages] = useState<QuizPackage[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<QuizPackage | null>(null)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)

  // Test picker
  const [pickerFor, setPickerFor]   = useState<QuizPackage | null>(null)
  const [allQuizzes, setAllQuizzes] = useState<QuizRow[]>([])
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [quizSearch, setQuizSearch] = useState('')
  const [savingTests, setSavingTests] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.quizPackages.list()
      setPackages(res?.data?.packages || [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load packages', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true) }

  const openEdit = (p: QuizPackage) => {
    setEditing(p)
    setForm({
      title: p.title ?? '',
      description: p.description ?? '',
      thumbnailUrl: p.thumbnail_url ?? '',
      subject: p.subject ?? '',
      isPaid: p.is_paid !== false,
      price: Number(p.price) || 0,
      coinPrice: Number(p.coin_price) || 0,
      status: p.status ?? 'draft',
      sortOrder: Number(p.sort_order) || 0,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return }
    // Same rule as individual tests: a paid thing with no price at all is a
    // dead end — the student is blocked and no unlock path applies.
    if (form.isPaid && (!form.price || form.price <= 0) && (!form.coinPrice || form.coinPrice <= 0)) {
      showToast('Set a rupee price or a coin price — a paid package with both at 0 can never be unlocked', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) await api.quizPackages.update(editing.id, form)
      else         await api.quizPackages.create(form)
      setShowModal(false)
      showToast(editing ? 'Package updated ✅' : 'Package created ✅')
      load()
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: QuizPackage) => {
    if (!confirm(`Delete "${p.title}"?\n\nThe ${p.test_count ?? 0} test(s) inside will NOT be deleted — they become standalone tests again.`)) return
    try {
      await api.quizPackages.delete(p.id)
      showToast('Package deleted — its tests are now standalone')
      load()
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error')
    }
  }

  const openPicker = async (p: QuizPackage) => {
    setPickerFor(p)
    setQuizSearch('')
    try {
      const [detail, quizRes] = await Promise.all([
        api.quizPackages.get(p.id),
        api.quizzes.list({ page: 1, limit: 500 }),
      ])
      const inPackage: QuizRow[] = detail?.data?.tests || []
      setSelected(new Set(inPackage.map(t => t.id)))
      setAllQuizzes(quizRes?.data?.quizzes || [])
    } catch (e: any) {
      showToast(e.message || 'Could not load tests', 'error')
      setPickerFor(null)
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const saveTests = async () => {
    if (!pickerFor) return
    setSavingTests(true)
    try {
      await api.quizPackages.setTests(pickerFor.id, Array.from(selected))
      showToast('Tests updated ✅')
      setPickerFor(null)
      load()
    } catch (e: any) {
      showToast(e.message || 'Could not save', 'error')
    } finally {
      setSavingTests(false)
    }
  }

  const visibleQuizzes = allQuizzes.filter(q =>
    !quizSearch.trim() || q.title?.toLowerCase().includes(quizSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Mock Test Packages"
        subtitle="Bundle tests into a series students buy once"
      />

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${packages.length} package${packages.length === 1 ? '' : 's'}`}
          </p>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700">
            <Plus size={16} /> New Package
          </button>
        </div>

        {!loading && packages.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Package size={34} className="mx-auto text-slate-300" />
            <p className="mt-3 font-bold text-slate-600">No packages yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create one, then pick which mock tests belong to it.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {packages.map(p => (
            <div key={p.id} className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 truncate">{p.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                      ${p.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.subject && <p className="text-xs text-slate-500 mt-0.5">{p.subject}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-slate-100" title="Edit">
                    <Pencil size={15} className="text-slate-600" />
                  </button>
                  <button onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-50" title="Delete">
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                  <Layers size={12} /> {p.test_count ?? 0} tests
                </span>
                {p.is_paid && Number(p.price) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <IndianRupee size={12} />{p.price}
                  </span>
                )}
                {p.is_paid && Number(p.coin_price) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    <Coins size={12} /> {p.coin_price}
                  </span>
                )}
                {!p.is_paid && (
                  <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-bold">Free</span>
                )}
                {(p.purchase_count ?? 0) > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                    {p.purchase_count} sold
                  </span>
                )}
              </div>

              {/* A rupee price only works once Play has the product. Until
                  the catalogue sync succeeds the Pay button cannot appear
                  in the app, so surface that rather than let it look fine. */}
              {p.is_paid && Number(p.price) > 0 && !p.gplay_product_id && (
                <p className="text-[11px] font-bold text-amber-600">
                  ⚠️ Not yet in the Google Play catalogue — rupee purchase won&apos;t work.
                  Save the package again; if it persists, the Play API credentials need checking.
                </p>
              )}

              <button onClick={() => openPicker(p)}
                className="w-full py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:border-brand-400 hover:text-brand-700">
                Choose tests
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Create / edit ───────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-extrabold text-slate-800">
                {editing ? 'Edit Package' : 'New Package'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="field-label">Title</label>
                <input className="input w-full" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. BPSC Prelims Test Series 2026" />
              </div>

              <div>
                <label className="field-label">Description</label>
                <textarea className="input w-full" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Subject <span className="text-slate-400 font-normal">(opt)</span></label>
                  <input className="input w-full" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Sort order</label>
                  <input type="number" className="input w-full" value={form.sortOrder}
                    onChange={e => setForm({ ...form, sortOrder: +e.target.value || 0 })} />
                </div>
              </div>

              <div>
                <label className="field-label">Thumbnail URL <span className="text-slate-400 font-normal">(opt)</span></label>
                <input className="input w-full" value={form.thumbnailUrl}
                  onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} />
              </div>

              <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none"
                    onClick={() => setForm({ ...form, isPaid: !form.isPaid })}>
                    <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.isPaid ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPaid ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">💰 Paid Package</span>
                  </label>
                </div>

                {form.isPaid && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">Price (₹)</label>
                        <input type="number" min={0} className="input w-full" value={form.price}
                          onChange={e => setForm({ ...form, price: +e.target.value || 0 })} />
                      </div>
                      <div>
                        <label className="field-label">🪙 Coin Price</label>
                        <input type="number" min={0} className="input w-full" value={form.coinPrice}
                          onChange={e => setForm({ ...form, coinPrice: +e.target.value || 0 })} />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Set either or both. A rupee price is charged through Google Play, so the
                      package appears in the Play catalogue within a few minutes of saving.
                      Buying it unlocks every test inside.
                      {form.price === 0 && form.coinPrice === 0 && (
                        <span className="block mt-1 font-bold text-amber-600">
                          ⚠️ Both are 0 — nobody can unlock this package.
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">Status</label>
                <select className="input w-full" value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft — hidden from students</option>
                  <option value="published">Published — visible in the app</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Test picker ─────────────────────────────────────── */}
      {pickerFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="px-5 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-slate-800">Tests in “{pickerFor.title}”</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected.size} selected · unticking a test makes it standalone again, it is not deleted
                  </p>
                </div>
                <button onClick={() => setPickerFor(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="relative mt-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input w-full pl-9" placeholder="Search tests…"
                  value={quizSearch} onChange={e => setQuizSearch(e.target.value)} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {visibleQuizzes.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-10">No tests match.</p>
              )}
              {visibleQuizzes.map(q => {
                const on = selected.has(q.id)
                // A test already in a DIFFERENT package: selecting it here
                // moves it. Say so rather than silently stealing it.
                const inOther = !!q.package_id && q.package_id !== pickerFor.id
                return (
                  <button key={q.id} onClick={() => toggle(q.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors
                      ${on ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                      ${on ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                      {on && <Check size={13} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{q.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {q.type || 'quiz'}{q.subject ? ` · ${q.subject}` : ''}
                        {q.total_questions != null ? ` · ${q.total_questions} Qs` : ''}
                        {q.status && q.status !== 'published' ? ` · ${q.status}` : ''}
                        {inOther && !on ? ' · in another package' : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setPickerFor(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={saveTests} disabled={savingTests}
                className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60">
                {savingTests ? 'Saving…' : `Save ${selected.size} test${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
