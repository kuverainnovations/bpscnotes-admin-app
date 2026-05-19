'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import DynamicSelect from '@/components/ui/DynamicSelect'
import api from '@/lib/api'
import {
  Search, Plus, Edit, Trash2, RefreshCw, Brain,
  ChevronDown, RotateCcw, Eye, Download, Upload,
  AlertCircle, Check, X, Filter, Image, FileText,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const EXAM_TAGS = ['BPSC 70th CCE', 'BPSC 71st CCE', 'Bihar Police SI', 'Bihar Constable', 'BPSC Teacher', 'UPSC CSE', 'SSC CGL']

const SUBJECT_EMOJI: Record<string, string> = {
  Polity: '⚖️', History: '🏛️', Geography: '🗺️', Economy: '💰',
  'Bihar GK': '🏔️', Science: '🔬', Environment: '🌿', General: '📚',
}

const emptyForm = {
  cardType: 'text' as 'text' | 'image',
  front: '', back: '', subject: 'Polity',
  topic: '', hint: '', example: '',
  examTags: ['BPSC 70th CCE'], isActive: true,
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [list, setList]             = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterSubject, setFilter]  = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [form, setForm]             = useState<any>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState<any>(null)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importResult, setImportResult] = useState<{ok:number,fail:number}|null>(null)
  // Image upload
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const imgRef   = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.flashcards.list({ subject: filterSubject, limit: 300 })
      setList(res.data?.flashcards || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filterSubject])

  const filtered = list.filter(c => {
    return !search ||
      (c.front || c.question || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.back  || c.answer   || '').toLowerCase().includes(search.toLowerCase())
  })

  const stats = [
    { label: 'Total Cards',  value: list.length,  emoji: '🃏' },
    { label: 'Subjects',     value: [...new Set(list.map(c => c.subject))].length, emoji: '📚' },
    { label: 'Image Cards',  value: list.filter(c => c.card_type === 'image').length, emoji: '🖼️' },
    { label: 'Text Cards',   value: list.filter(c => c.card_type !== 'image').length, emoji: '📝' },
  ]

  const openNew  = () => {
    setEditing(null); setForm(emptyForm); setImagePreviewUrl(null); setShowModal(true)
  }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      cardType:  c.card_type  || 'text',
      front:     c.front      || c.question || '',
      back:      c.back       || c.answer   || '',
      subject:   c.subject    || 'Polity',
      topic:     c.topic      || '',
      hint:      c.hint       || '',
      example:   c.example    || '',
      examTags:  c.exam_tags  || [],
      isActive:  c.is_active  !== false,
    })
    setImagePreviewUrl(c.image_url || null)
    setShowModal(true)
  }

  // ── Image upload to Cloudinary via admin API ───────────────
  const handleImageUpload = async (file: File) => {
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      // Use the existing thumbnail upload route which handles Cloudinary
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/admin/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: formData,
      })
      const data = await res.json()
      const url  = data.data?.url || data.data?.imageUrl || data.url
      if (url) {
        setImagePreviewUrl(url)
        setForm((f: any) => ({ ...f, imageUrl: url }))
      } else {
        alert('Upload succeeded but no URL returned. Check server logs.')
      }
    } catch (e: any) {
      alert('Image upload failed: ' + e.message)
    } finally {
      setImageUploading(false)
    }
  }

  const save = async () => {
    const front = form.front.trim()
    const back  = form.back.trim()
    if (!front) { alert('Question (front) is required.'); return }
    if (!back)  { alert('Answer (back) is required.'); return }
    if (form.cardType === 'image' && !imagePreviewUrl && !form.imageUrl) {
      alert('Please upload an image for the image-type card.'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        front,
        back,
        cardType: form.cardType,
        imageUrl: form.cardType === 'image' ? (imagePreviewUrl || form.imageUrl) : null,
        topic:    form.topic.trim() || form.subject,
        hint:     form.hint.trim(),
        example:  form.example.trim(),
      }
      if (editing) await api.flashcards.update(editing.id, payload)
      else         await api.flashcards.create(payload)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const del = async (id: string, front: string) => {
    if (!confirm(`Delete this flashcard?\n"${front.slice(0,80)}..."`)) return
    try { await api.flashcards.delete(id); load() }
    catch (e: any) { alert(e.message || 'Failed to delete') }
  }

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'))
    if (!lines.length) { alert('No valid lines found.'); return }
    setImporting(true)
    let ok = 0, fail = 0
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 2) { fail++; continue }
      const [front, back, subject = 'General', topic = ''] = parts
      if (!front || !back) { fail++; continue }
      try {
        await api.flashcards.create({ front, back, subject, topic, cardType: 'text', examTags: ['BPSC 70th CCE'], isActive: true })
        ok++
      } catch { fail++ }
    }
    setImporting(false); setImportResult({ ok, fail })
    if (ok > 0) { load(); setImportText('') }
  }

  const handleExport = () => {
    const csv = ['# Front | Back | Subject | Topic', ...list.map(c =>
      `${c.front || c.question} | ${c.back || c.answer} | ${c.subject} | ${c.topic || c.subject}`
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `flashcards-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Flashcards — Active Recall"
        subtitle="Create text or image study cards for the Active Recall feature"
      />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Info banner */}
        <div className="card p-4 border-l-4 border-brand-500 bg-blue-50">
          <div className="flex gap-3">
            <Brain className="text-brand-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Text & Image Cards Supported</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                <strong>Text cards</strong> — question on front, answer on back (default).{' '}
                <strong>Image cards</strong> — upload a diagram, map or chart; students identify the correct answer.
                Both types support hints and examples shown to students during study.
              </p>
            </div>
          </div>
        </div>

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

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search cards…" className="input pl-9 w-full" />
          </div>
          <div className="w-48">
            <DynamicSelect type="subjects" value={filterSubject} onChange={setFilter} placeholder="All Subjects" />
          </div>
          <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2">
            <Upload size={14} /> Import
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Export
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> New Flashcard
          </button>
        </div>

        {/* Import panel */}
        {showImport && (
          <div className="card p-4 space-y-3">
            <p className="font-semibold text-sm text-slate-800">Bulk Import (pipe-separated)</p>
            <p className="text-xs text-slate-500">Format: <code>Question | Answer | Subject | Topic</code></p>
            <textarea rows={6} value={importText} onChange={e => setImportText(e.target.value)}
              className="input w-full font-mono text-xs"
              placeholder="What is Article 17? | Abolishes untouchability | Polity | Fundamental Rights" />
            {importResult && (
              <p className="text-sm">✅ {importResult.ok} imported · ❌ {importResult.fail} failed</p>
            )}
            <button onClick={handleImport} disabled={importing || !importText.trim()}
              className="btn-primary text-sm">
              {importing ? 'Importing…' : 'Import Cards'}
            </button>
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-brand-500" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">🃏</p>
            <p className="font-semibold text-slate-700">No flashcards found</p>
            <p className="text-sm text-slate-500 mt-1">Create your first card to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      {SUBJECT_EMOJI[c.subject] || '📚'} {c.subject}
                    </span>
                    {c.card_type === 'image' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium flex items-center gap-1">
                        <Image size={10} /> Image
                      </span>
                    )}
                    {!c.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Hidden</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setPreview(c) }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Preview">
                      <Eye size={13} className="text-slate-400" />
                    </button>
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit size={13} className="text-blue-500" />
                    </button>
                    <button onClick={() => del(c.id, c.front || c.question || '')}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>

                {c.card_type === 'image' && c.image_url && (
                  <img src={c.image_url} alt="card" className="w-full h-32 object-cover rounded-lg mb-3 bg-slate-50" />
                )}

                <div className="space-y-2">
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <p className="text-[9px] text-blue-500 font-bold uppercase mb-0.5">Front</p>
                    <p className="text-xs text-slate-800 font-medium line-clamp-2">
                      {c.front || c.question}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5">
                    <p className="text-[9px] text-green-600 font-bold uppercase mb-0.5">Back</p>
                    <p className="text-xs text-slate-700 line-clamp-2">
                      {c.back || c.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview modal */}
        {preview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setPreview(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Card Preview</h3>
                <button onClick={() => setPreview(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={14} />
                </button>
              </div>
              {preview.card_type === 'image' && preview.image_url && (
                <img src={preview.image_url} alt="card" className="w-full rounded-xl" />
              )}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-[10px] text-blue-500 font-bold mb-1">FRONT (Question)</p>
                <p className="text-sm font-semibold text-slate-900">{preview.front || preview.question}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-[10px] text-green-600 font-bold mb-1">BACK (Answer)</p>
                <p className="text-sm text-slate-700">{preview.back || preview.answer}</p>
              </div>
              {preview.hint && (
                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="text-[10px] text-yellow-600 font-bold mb-1">💡 HINT</p>
                  <p className="text-xs text-slate-700">{preview.hint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto">

              <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    {editing ? 'Edit Flashcard' : 'New Flashcard'}
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {editing ? 'Update this study card' : 'Add a new study card for Active Recall'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Card Type Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Card Type *</label>
                  <div className="flex gap-3">
                    {(['text', 'image'] as const).map(ct => (
                      <button key={ct} type="button"
                        onClick={() => { setForm((f: any) => ({ ...f, cardType: ct })); if (ct === 'text') setImagePreviewUrl(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.cardType === ct
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-500 hover:border-brand-300'
                        }`}>
                        {ct === 'text' ? <FileText size={16} /> : <Image size={16} />}
                        {ct === 'text' ? 'Text Card' : 'Image Card'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {form.cardType === 'image'
                      ? 'Upload a diagram, map, or chart image. Students identify the correct option.'
                      : 'Standard Q&A flashcard. Students read the question and recall the answer.'}
                  </p>
                </div>

                {/* Image Upload (only for image cards) */}
                {form.cardType === 'image' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Card Image *</label>
                    <input ref={imgRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
                    {imagePreviewUrl ? (
                      <div className="relative">
                        <img src={imagePreviewUrl} alt="preview" className="w-full max-h-48 object-contain rounded-xl border border-slate-200" />
                        <button onClick={() => { setImagePreviewUrl(null); setForm((f: any) => ({ ...f, imageUrl: null })) }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600">
                          <X size={12} />
                        </button>
                        <button onClick={() => imgRef.current?.click()}
                          className="absolute bottom-2 right-2 py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                          Change
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => imgRef.current?.click()} disabled={imageUploading}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50 transition-all">
                        {imageUploading ? (
                          <>
                            <RefreshCw className="animate-spin text-brand-500" size={24} />
                            <span className="text-sm text-slate-500">Uploading…</span>
                          </>
                        ) : (
                          <>
                            <Image size={28} className="text-slate-300" />
                            <span className="text-sm font-semibold text-slate-600">Click to upload image</span>
                            <span className="text-xs text-slate-400">PNG, JPG, WEBP — max 5 MB</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                  <DynamicSelect
                    type="subjects"
                    value={form.subject}
                    onChange={v => setForm((f: any) => ({ ...f, subject: v }))}
                    placeholder="Select subject…"
                    required
                  />
                </div>

                {/* Topic (optional but recommended) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Topic <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input value={form.topic}
                    onChange={e => setForm((f: any) => ({ ...f, topic: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. Fundamental Rights, Mughal Empire, Water Bodies…" />
                </div>

                {/* Front (Question) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {form.cardType === 'image' ? 'Question / Description' : 'Question (Front of card)'} *
                  </label>
                  <textarea value={form.front}
                    onChange={e => setForm((f: any) => ({ ...f, front: e.target.value }))}
                    rows={3} className="input w-full"
                    placeholder={form.cardType === 'image'
                      ? 'Which shaded part represents the incorrect part of the Bihar map?'
                      : 'e.g. Which article of the Indian Constitution abolishes untouchability?'
                    } />
                </div>

                {/* Back (Answer) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Answer (Back of card) *</label>
                  <textarea value={form.back}
                    onChange={e => setForm((f: any) => ({ ...f, back: e.target.value }))}
                    rows={3} className="input w-full"
                    placeholder={form.cardType === 'image'
                      ? 'B — The highlighted region in position B is incorrect.'
                      : 'Article 17 abolishes untouchability and forbids its practice in any form.'
                    } />
                </div>

                {/* Hint (optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Hint 💡 <span className="text-slate-400 font-normal">(shown on front before flip)</span>
                  </label>
                  <input value={form.hint}
                    onChange={e => setForm((f: any) => ({ ...f, hint: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. Think about Part III of the Constitution…" />
                </div>

                {/* Example (optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Example 📌 <span className="text-slate-400 font-normal">(shown on back)</span>
                  </label>
                  <input value={form.example}
                    onChange={e => setForm((f: any) => ({ ...f, example: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. Bhim Rao Ambedkar invoked Article 17 in…" />
                </div>

                {/* Exam Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Relevant Exams</label>
                  <div className="flex flex-wrap gap-2">
                    {EXAM_TAGS.map(tag => {
                      const sel = (form.examTags || []).includes(tag)
                      return (
                        <button key={tag} type="button"
                          onClick={() => {
                            const current = form.examTags || []
                            setForm((f: any) => ({
                              ...f,
                              examTags: sel ? current.filter((t: string) => t !== tag) : [...current, tag]
                            }))
                          }}
                          className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                            sel ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                          }`}>
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <input type="checkbox" id="isActive" checked={form.isActive}
                    onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-500" />
                  <label htmlFor="isActive" className="text-sm text-slate-700 font-medium cursor-pointer">
                    Visible to students
                  </label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-100">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium">
                  Cancel
                </button>
                <button onClick={save}
                  disabled={saving || !form.front.trim() || !form.back.trim() || imageUploading}
                  className="flex-1 btn-primary">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Flashcard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
