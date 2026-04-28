'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, EmptyState, useToast } from '@/components/ui/feedback'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, Upload, RefreshCw, Pin, TrendingUp } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  pdf:   'bg-red-50 text-red-600 border-red-100',
  pyq:   'bg-purple-50 text-purple-600 border-purple-100',
  book:  'bg-blue-50 text-blue-600 border-blue-100',
  video: 'bg-orange-50 text-orange-600 border-orange-100',
}
const TYPE_EMOJI: Record<string, string> = { pdf: '📄', pyq: '📝', book: '📚', video: '🎬' }

const EMPTY_FORM = {
  title: '', subject: '', type: 'pdf', author: '', description: '',
  isPremium: false, isPinned: false, examTags: ['BPSC 70th CCE'], status: 'published',
}

export default function NotesPage() {
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [file, setFile]           = useState<File | null>(null)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.library.list({ search, type: typeFilter, status: statusFilter }),
    [search, typeFilter, statusFilter]
  )
  const notes: any[] = data?.notes || []

  const { mutate: save, loading: saving } = useMutation(
    (formData: any, fileData?: File) => editing
      ? api.library.update(editing.id, formData)
      : api.library.create(formData, fileData || undefined),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Note updated ✅' : 'Note created ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.library.delete(id),
    { onSuccess: () => { refetch(); showToast('Deleted') }, onError: (msg) => showToast(msg, 'error') }
  )

  const { mutate: toggleStatus } = useMutation(
    (id: string, action: string) => api.library.review(id, action),
    { onSuccess: () => { refetch(); showToast('Status updated ✅') }, onError: (msg) => showToast(msg, 'error') }
  )

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFile(null)
    setShowModal(true)
  }

  const openEdit = (note: any) => {
    setEditing(note)
    setForm({
      title: note.title, subject: note.subject, type: note.type, author: note.author || '',
      description: note.description || '', isPremium: note.is_premium, isPinned: note.is_pinned,
      examTags: note.exam_tags || [], status: note.status,
    })
    setFile(null)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.type) {
      showToast('Title, subject and type are required', 'error'); return
    }
    await save(form, file || undefined)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await remove(id)
  }

  const stats = [
    { label: 'Total Notes',   value: notes.length,                              emoji: '📚' },
    { label: 'Published',     value: notes.filter(n => n.status === 'published').length, emoji: '✅' },
    { label: 'Premium',       value: notes.filter(n => n.is_premium).length,    emoji: '👑' },
    { label: 'Total Downloads', value: formatNumber(notes.reduce((a, n) => a + (n.download_count || 0), 0)), emoji: '⬇️' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Notes & Library" subtitle="Manage PDF notes, PYQs, books and video notes" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="input pl-9"
            />
          </div>
          <select value={typeFilter} onChange={e => setType(e.target.value)} className="input w-auto">
            <option value="">All Types</option>
            <option value="pdf">📄 PDF</option>
            <option value="pyq">📝 PYQ</option>
            <option value="book">📚 Book</option>
            <option value="video">🎬 Video</option>
          </select>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="input w-auto">
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
          </select>
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Add Note</button>
        </div>

        {/* Content */}
        {loading ? <PageLoader /> : error ? (
          <div className="card"><ErrorMessage message={error} onRetry={refetch} /></div>
        ) : notes.length === 0 ? (
          <div className="card"><EmptyState icon="📚" title="No notes yet" subtitle="Add your first note or PDF" /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Note', 'Type', 'Subject', 'Author', 'Downloads', 'Rating', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notes.map(note => (
                  <tr key={note.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${TYPE_COLORS[note.type]?.split(' ')[0]}`}>
                          {TYPE_EMOJI[note.type] || '📄'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {note.is_pinned && <Pin size={11} className="text-blue-500" />}
                            {note.is_trending && <TrendingUp size={11} className="text-green-500" />}
                            <p className="font-semibold text-slate-800 max-w-[200px] truncate">{note.title}</p>
                          </div>
                          {note.is_premium && <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">👑 Premium</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${TYPE_COLORS[note.type] || ''}`}>{note.type?.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{note.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{note.author || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatNumber(note.download_count || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm font-semibold">{parseFloat(note.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`badge ${getStatusColor(note.status)}`}>{note.status}</span>
                        {note.status === 'review' && (
                          <div className="flex gap-1">
                            <button onClick={() => toggleStatus(note.id, 'published')} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">Approve</button>
                            <button onClick={() => toggleStatus(note.id, 'rejected')} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(note)}
                          className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors"
                        >
                          <Edit size={13} className="text-yellow-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={13} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
                {editing ? 'Edit Note' : 'Add Note'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Note title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject *</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input">
                    <option value="">Select subject</option>
                    {['Polity', 'History', 'Economy', 'Geography', 'Bihar GK', 'Science & Tech', 'Maths', 'General Studies'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                    <option value="pdf">📄 PDF</option>
                    <option value="pyq">📝 PYQ</option>
                    <option value="book">📚 Book</option>
                    <option value="video">🎬 Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Author</label>
                  <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="input" placeholder="Author name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input h-16 resize-none" placeholder="Brief description..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Upload File (optional)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPremium} onChange={e => setForm({ ...form, isPremium: e.target.checked })} />
                  <span className="text-sm text-slate-700">👑 Premium</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })} />
                  <span className="text-sm text-slate-700">📌 Pinned</span>
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                <Upload size={14} />
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
