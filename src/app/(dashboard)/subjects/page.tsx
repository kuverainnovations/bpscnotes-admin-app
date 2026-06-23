'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X, BookOpen } from 'lucide-react'

interface Subject {
  id: string
  name: string
  emoji: string
  color_hex: string
  sort_order: number
  is_active: boolean
  created_at: string
  description?: string
}

const EMOJI_PRESETS = ['📚','⚖️','📜','🌍','📈','🔬','🏔️','🌿','🔢','🔤','📝','🏛️','🌐','🛡️','🎭','🧮']
const COLOR_PRESETS = [
  '#1565C0','#6D4C41','#2E7D32','#E65100','#6A1B9A',
  '#00838F','#37474F','#558B2F','#AD1457','#1A237E',
  '#BF360C','#004D40','#311B92','#827717','#01579B',
]

function SubjectFormModal({
  subject, onClose, onSave,
}: {
  subject?: Subject | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}) {
  const [name, setName]     = useState(subject?.name     ?? '')
  const [emoji, setEmoji]   = useState(subject?.emoji    ?? '📚')
  const [color, setColor]   = useState(subject?.color_hex ?? '#1565C0')
  const [desc, setDesc]     = useState(subject?.description ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), emoji, colorHex: color, description: desc.trim() || undefined })
      onClose()
    } catch (e: any) {
      alert(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg">{subject ? 'Edit Subject' : 'Add Subject'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={15} className="text-slate-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Polity, Geography, Economy"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-100 hover:bg-slate-200'}`}
                >{e}</button>
              ))}
            </div>
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              placeholder="Or type custom emoji"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Colour */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Accent Colour</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-600' : ''}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
              <input value={color} onChange={e => setColor(e.target.value)} placeholder="#1565C0" className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Short description shown in app"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-2 font-semibold">Preview</p>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                style={{ background: color }}
              >
                {emoji} {name || 'Subject Name'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : subject ? 'Save Changes' : 'Add Subject'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalSubject, setModalSubject] = useState<Subject | null | undefined>(undefined) // undefined=closed, null=new, Subject=edit
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()

  const load = useCallback(async () => {
    try {
      const res = await api.subjects.list()
      setSubjects(res.data?.subjects ?? [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: any) => {
    const res = await api.subjects.create(data)
    showToast('Subject added', 'success')
    setSubjects(prev => [...prev, res.data?.subject].filter(Boolean))
    await load()
  }

  const handleUpdate = async (id: string, data: any) => {
    await api.subjects.update(id, data)
    showToast('Subject updated', 'success')
    await load()
  }

  const handleToggle = async (s: Subject) => {
    setToggling(s.id)
    try {
      await api.subjects.update(s.id, { isActive: !s.is_active })
      showToast(s.is_active ? 'Subject disabled' : 'Subject enabled', 'success')
      setSubjects(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    } catch (e: any) {
      showToast(e.message || 'Toggle failed', 'error')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject? Materials using this subject will keep the existing value.')) return
    setDeleting(id)
    try {
      await api.subjects.delete(id)
      showToast('Subject deleted', 'success')
      setSubjects(prev => prev.filter(s => s.id !== id))
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const moveOrder = async (s: Subject, direction: 'up' | 'down') => {
    const sorted = [...subjects].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(x => x.id === s.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swapWith = sorted[swapIdx]
    // Swap orders
    await Promise.all([
      api.subjects.update(s.id,       { sortOrder: swapWith.sort_order }),
      api.subjects.update(swapWith.id, { sortOrder: s.sort_order }),
    ])
    showToast('Order updated', 'success')
    await load()
  }

  const sorted = [...subjects].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Subject Master" />
      <ToastContainer />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="text-blue-600" size={24} />
              Subject Master
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Controls which subjects appear in Android filters and upload dropdowns. Changes take effect immediately.
            </p>
          </div>
          <button
            onClick={() => setModalSubject(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Subject
          </button>
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600">
            {subjects.length} total · {subjects.filter(s => s.is_active).length} active
          </span>
        </div>

        {/* Subject list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-3xl mb-3">📚</p>
            <p className="font-bold text-slate-700">No subjects yet</p>
            <p className="text-sm text-slate-500 mt-1">Add your first subject above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, idx) => (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border flex items-center gap-4 px-4 py-3.5 transition-all ${s.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60'}`}
              >
                {/* Colour swatch + emoji */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                  style={{ background: s.color_hex + '22', border: `2px solid ${s.color_hex}44` }}
                >
                  {s.emoji}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                    {!s.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">DISABLED</span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-400" style={{ color: s.color_hex }}>{s.color_hex}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] text-slate-400">order: {s.sort_order}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder */}
                  <button
                    onClick={() => moveOrder(s, 'up')}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <ChevronUp size={14} className="text-slate-500" />
                  </button>
                  <button
                    onClick={() => moveOrder(s, 'down')}
                    disabled={idx === sorted.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(s)}
                    disabled={toggling === s.id}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${s.is_active ? 'hover:bg-green-50 text-green-600' : 'hover:bg-slate-100 text-slate-400'}`}
                    title={s.is_active ? 'Disable subject' : 'Enable subject'}
                  >
                    <Check size={14} />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => setModalSubject(s)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-slate-400 mt-6 text-center">
          Only active subjects appear in Android filters and upload forms. Disabled subjects are hidden from users but existing materials keep their subject value.
        </p>
      </div>

      {/* Create / Edit modal */}
      {modalSubject !== undefined && (
        <SubjectFormModal
          subject={modalSubject}
          onClose={() => setModalSubject(undefined)}
          onSave={data =>
            modalSubject
              ? handleUpdate(modalSubject.id, data)
              : handleCreate(data)
          }
        />
      )}
    </div>
  )
}