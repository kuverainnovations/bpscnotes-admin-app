'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import DynamicSelect from '@/components/ui/DynamicSelect'
import api from '@/lib/api'
import {
  Search, Plus, Edit, Trash2, RefreshCw, Brain,
  Eye, Download, Upload, X, Image, FileText,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type SideType = 'text' | 'image'

const EXAM_TAGS = [
  'BPSC 70th CCE', 'BPSC 71st CCE', 'Bihar Police SI',
  'Bihar Constable', 'BPSC Teacher', 'UPSC CSE', 'SSC CGL',
]
const SUBJECT_EMOJI: Record<string, string> = {
  Polity: '⚖️', History: '🏛️', Geography: '🗺️', Economy: '💰',
  'Bihar GK': '🏔️', Science: '🔬', Environment: '🌿', General: '📚',
}
const emptyForm = {
  frontType:    'text'  as SideType,
  backType:     'text'  as SideType,
  front:        '',
  back:         '',
  subject:      'Polity',
  topic:        '',
  hint:         '',
  example:      '',
  examTags:     ['BPSC 70th CCE'] as string[],
  isActive:     true,
  imageUrl:     null as string | null,
  backImageUrl: null as string | null,
}

// ─────────────────────────────────────────────────────────────
// Upload helper
// ─────────────────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/admin/upload/image`,
    { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }, body: fd }
  )
  const data = await res.json()
  const url  = data.data?.url || data.data?.imageUrl || data.url
  if (!url) throw new Error('No URL returned from upload')
  return url
}

// ─────────────────────────────────────────────────────────────
// Reusable image upload widget
// ─────────────────────────────────────────────────────────────
function ImageUploadWidget({
  sideLabel, previewUrl, uploading, inputRef, onUpload, onRemove,
}: {
  sideLabel:  string
  previewUrl: string | null
  uploading:  boolean
  inputRef:   React.RefObject<HTMLInputElement>
  onUpload:   (file: File) => void
  onRemove:   () => void
}) {
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
      {previewUrl ? (
        <div className="relative">
          <img src={previewUrl} alt={`${sideLabel} image`}
            className="w-full max-h-44 object-contain rounded-xl border border-slate-200 bg-slate-50" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
              Change
            </button>
            <button type="button" onClick={onRemove}
              className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm">
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2
                     hover:border-brand-300 hover:bg-brand-50 transition-all disabled:opacity-60">
          {uploading ? (
            <><RefreshCw className="animate-spin text-brand-500" size={22} /><span className="text-sm text-slate-500">Uploading…</span></>
          ) : (
            <><Image size={24} className="text-slate-300" /><span className="text-sm font-semibold text-slate-500">Upload {sideLabel} image</span><span className="text-xs text-slate-400">PNG · JPG · WEBP · max 5 MB</span></>
          )}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Side type toggle: Text / Image
// ─────────────────────────────────────────────────────────────
function SideTypeToggle({ value, onChange }: { value: SideType; onChange: (v: SideType) => void }) {
  return (
    <div className="flex gap-1.5">
      {(['text', 'image'] as SideType[]).map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg border text-[11px] font-semibold transition-all ${
            value === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-400 hover:border-brand-200'
          }`}>
          {t === 'text' ? <FileText size={11} /> : <Image size={11} />}
          {t === 'text' ? 'Text' : 'Image'}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [list, setList]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterSubject, setFilter]= useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [preview, setPreview]     = useState<any>(null)
  const [importText, setImportText]   = useState('')
  const [showImport, setShowImport]   = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<{ok:number,fail:number}|null>(null)
  const [frontUploading, setFrontUploading] = useState(false)
  const [backUploading,  setBackUploading]  = useState(false)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try { setList((await api.flashcards.list({ subject: filterSubject, limit: 300 })).data?.flashcards || []) }
    catch (e) { console.error(e) }
    finally   { setLoading(false) }
  }
  useEffect(() => { load() }, [filterSubject])

  const filtered = list.filter(c =>
    !search ||
    (c.front || c.question || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.back  || c.answer   || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = [
    { label: 'Total',       value: list.length,                                                emoji: '🃏' },
    { label: 'Text only',   value: list.filter(c => !c.image_url && !c.back_image_url).length, emoji: '📝' },
    { label: 'Image front', value: list.filter(c =>  c.image_url).length,                     emoji: '🖼️' },
    { label: 'Image back',  value: list.filter(c =>  c.back_image_url).length,                emoji: '🔄' },
  ]

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      frontType:    c.image_url      ? 'image' : 'text',
      backType:     c.back_image_url ? 'image' : 'text',
      front:        c.front     || c.question || '',
      back:         c.back      || c.answer   || '',
      subject:      c.subject   || 'Polity',
      topic:        c.topic     || '',
      hint:         c.hint      || '',
      example:      c.example   || '',
      examTags:     c.exam_tags || [],
      isActive:     c.is_active !== false,
      imageUrl:     c.image_url      || null,
      backImageUrl: c.back_image_url || null,
    })
    setShowModal(true)
  }

  const handleFrontUpload = async (file: File) => {
    setFrontUploading(true)
    try { setForm((f: any) => ({ ...f, imageUrl: '' })); const url = await uploadToCloudinary(file); setForm((f: any) => ({ ...f, imageUrl: url })) }
    catch (e: any) { alert('Front upload failed: ' + e.message); setForm((f: any) => ({ ...f, imageUrl: null })) }
    finally { setFrontUploading(false) }
  }

  const handleBackUpload = async (file: File) => {
    setBackUploading(true)
    try { const url = await uploadToCloudinary(file); setForm((f: any) => ({ ...f, backImageUrl: url })) }
    catch (e: any) { alert('Back upload failed: ' + e.message) }
    finally { setBackUploading(false) }
  }

  const save = async () => {
    if (form.frontType === 'text'  && !form.front.trim())       { alert('Question text is required.'); return }
    if (form.frontType === 'image' && !form.imageUrl)            { alert('Please upload a front image.'); return }
    if (form.backType  === 'text'  && !form.back.trim())         { alert('Answer text is required.'); return }
    if (form.backType  === 'image' && !form.backImageUrl)        { alert('Please upload a back image.'); return }

    setSaving(true)
    try {
      const payload = {
        front:        form.front.trim()  || ' ',
        back:         form.back.trim()   || ' ',
        subject:      form.subject,
        topic:        form.topic.trim()  || form.subject,
        hint:         form.hint.trim(),
        example:      form.example.trim(),
        examTags:     form.examTags,
        isActive:     form.isActive,
        cardType:     form.frontType,
        imageUrl:     form.frontType === 'image' ? form.imageUrl     : null,
        backImageUrl: form.backType  === 'image' ? form.backImageUrl : null,
      }
      if (editing) await api.flashcards.update(editing.id, payload)
      else         await api.flashcards.create(payload)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const del = async (id: string, label: string) => {
    if (!confirm(`Delete "${label.slice(0,60)}"?`)) return
    try { await api.flashcards.delete(id); load() }
    catch (e: any) { alert(e.message) }
  }

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'))
    if (!lines.length) { alert('No valid lines.'); return }
    setImporting(true); let ok = 0, fail = 0
    for (const line of lines) {
      const [front, back, subject = 'General', topic = ''] = line.split('|').map(p => p.trim())
      if (!front || !back) { fail++; continue }
      try { await api.flashcards.create({ front, back, subject, topic, cardType: 'text', examTags: ['BPSC 70th CCE'], isActive: true }); ok++ }
      catch { fail++ }
    }
    setImporting(false); setImportResult({ ok, fail })
    if (ok > 0) { load(); setImportText('') }
  }

  return (
    <div className="min-h-screen">
      <Header title="Flashcards — Active Recall"
        subtitle="Front and back sides are independently text or image" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Info banner */}
        <div className="card p-4 border-l-4 border-brand-500 bg-blue-50">
          <div className="flex gap-3">
            <Brain className="text-brand-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Front & Back are independent</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                <strong>Front (question)</strong> and <strong>back (answer)</strong> can each be
                text or image independently. Examples: image question + text answer; text question
                + diagram answer; or both as images. Add a text caption whenever you upload an image.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cards…" className="input pl-9 w-full" />
          </div>
          <div className="w-48">
            <DynamicSelect type="subjects" value={filterSubject} onChange={setFilter} placeholder="All Subjects" />
          </div>
          <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2"><Upload size={14} /> Import</button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={14} /> New Flashcard</button>
        </div>

        {/* Import */}
        {showImport && (
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold">Bulk Import — <code className="text-xs">Question | Answer | Subject | Topic</code></p>
            <textarea rows={5} value={importText} onChange={e => setImportText(e.target.value)} className="input w-full font-mono text-xs"
              placeholder="What is Article 17? | Abolishes untouchability | Polity | Fundamental Rights" />
            {importResult && <p className="text-sm">✅ {importResult.ok} imported · ❌ {importResult.fail} failed</p>}
            <button onClick={handleImport} disabled={importing || !importText.trim()} className="btn-primary text-sm">
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        )}

        {/* Card grid */}
        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-brand-500" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="card py-16 text-center"><p className="text-4xl mb-3">🃏</p><p className="font-semibold text-slate-700">No flashcards found</p></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => {
              const hasFront = !!c.image_url
              const hasBack  = !!c.back_image_url
              return (
                <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{SUBJECT_EMOJI[c.subject] || '📚'} {c.subject}</span>
                      {(hasFront || hasBack) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                          {hasFront && hasBack ? '🖼️+🖼️ Both' : hasFront ? '🖼️ Front' : '🖼️ Back'}
                        </span>
                      )}
                      {!c.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Hidden</span>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setPreview(c)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye size={13} className="text-slate-400" /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit size={13} className="text-blue-500" /></button>
                      <button onClick={() => del(c.id, c.front || c.question || '')} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-[9px] text-blue-500 font-bold uppercase mb-1">Front · Question</p>
                      {hasFront && <img src={c.image_url} alt="" className="w-full h-16 object-cover rounded mb-1" />}
                      {(c.front || c.question) && <p className="text-xs text-slate-800 font-medium line-clamp-2">{c.front || c.question}</p>}
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-[9px] text-green-600 font-bold uppercase mb-1">Back · Answer</p>
                      {hasBack  && <img src={c.back_image_url} alt="" className="w-full h-16 object-cover rounded mb-1" />}
                      {(c.back || c.answer) && <p className="text-xs text-slate-700 line-clamp-2">{c.back || c.answer}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Preview modal */}
        {preview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between"><h3 className="font-bold text-slate-900">Preview</h3><button onClick={() => setPreview(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button></div>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-blue-500 font-bold">FRONT (Question)</p>
                {preview.image_url && <img src={preview.image_url} alt="" className="w-full rounded-lg" />}
                {(preview.front || preview.question) && <p className="text-sm font-semibold text-slate-900">{preview.front || preview.question}</p>}
              </div>
              <div className="bg-green-50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-green-600 font-bold">BACK (Answer)</p>
                {preview.back_image_url && <img src={preview.back_image_url} alt="" className="w-full rounded-lg" />}
                {(preview.back || preview.answer) && <p className="text-sm text-slate-700">{preview.back || preview.answer}</p>}
              </div>
              {preview.hint && <div className="bg-yellow-50 rounded-xl p-3"><p className="text-[10px] text-yellow-600 font-bold mb-1">💡 HINT</p><p className="text-xs">{preview.hint}</p></div>}
            </div>
          </div>
        )}

        {/* ── Create / Edit Modal ─────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto">

              <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">{editing ? 'Edit Flashcard' : 'New Flashcard'}</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Front and back are independently text or image</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Subject + Topic */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                    <DynamicSelect type="subjects" value={form.subject} onChange={v => setForm((f: any) => ({ ...f, subject: v }))} placeholder="Subject…" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topic <span className="font-normal text-slate-400">(optional)</span></label>
                    <input value={form.topic} onChange={e => setForm((f: any) => ({ ...f, topic: e.target.value }))} className="input" placeholder="e.g. Fundamental Rights" />
                  </div>
                </div>

                {/* ── FRONT (Question side) ─────────────────────── */}
                <div className="border border-blue-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-100">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">🔵 Front — Question</span>
                    <SideTypeToggle value={form.frontType}
                      onChange={v => setForm((f: any) => ({ ...f, frontType: v, imageUrl: v === 'text' ? null : f.imageUrl }))} />
                  </div>
                  <div className="p-4 space-y-3">
                    {form.frontType === 'image' && (
                      <ImageUploadWidget sideLabel="front (question)" previewUrl={form.imageUrl}
                        uploading={frontUploading} inputRef={frontRef}
                        onUpload={handleFrontUpload}
                        onRemove={() => setForm((f: any) => ({ ...f, imageUrl: null }))} />
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {form.frontType === 'image' ? 'Question / caption (optional)' : 'Question *'}
                      </label>
                      <textarea value={form.front} onChange={e => setForm((f: any) => ({ ...f, front: e.target.value }))}
                        rows={3} className="input w-full"
                        placeholder={form.frontType === 'image'
                          ? 'Which shaded part represents the incorrect part of the Bihar map?'
                          : 'e.g. Which article abolishes untouchability?'} />
                    </div>
                  </div>
                </div>

                {/* ── BACK (Answer side) ────────────────────────── */}
                <div className="border border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-3 flex items-center justify-between border-b border-green-100">
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">🟢 Back — Answer</span>
                    <SideTypeToggle value={form.backType}
                      onChange={v => setForm((f: any) => ({ ...f, backType: v, backImageUrl: v === 'text' ? null : f.backImageUrl }))} />
                  </div>
                  <div className="p-4 space-y-3">
                    {form.backType === 'image' && (
                      <ImageUploadWidget sideLabel="back (answer)" previewUrl={form.backImageUrl}
                        uploading={backUploading} inputRef={backRef}
                        onUpload={handleBackUpload}
                        onRemove={() => setForm((f: any) => ({ ...f, backImageUrl: null }))} />
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {form.backType === 'image' ? 'Answer / caption (optional)' : 'Answer *'}
                      </label>
                      <textarea value={form.back} onChange={e => setForm((f: any) => ({ ...f, back: e.target.value }))}
                        rows={3} className="input w-full"
                        placeholder={form.backType === 'image'
                          ? 'Ans: B — The boundary shown in position B is incorrect.'
                          : 'Article 17 abolishes untouchability in any form.'} />
                    </div>
                  </div>
                </div>

                {/* Hint + Example */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hint 💡 <span className="font-normal text-slate-400">(on front)</span></label>
                    <input value={form.hint} onChange={e => setForm((f: any) => ({ ...f, hint: e.target.value }))} className="input w-full" placeholder="Think about Part III…" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Example 📌 <span className="font-normal text-slate-400">(on back)</span></label>
                    <input value={form.example} onChange={e => setForm((f: any) => ({ ...f, example: e.target.value }))} className="input w-full" placeholder="Ambedkar invoked Article 17…" />
                  </div>
                </div>

                {/* Exam Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Relevant Exams</label>
                  <div className="flex flex-wrap gap-2">
                    {EXAM_TAGS.map(tag => {
                      const sel = (form.examTags || []).includes(tag)
                      return (
                        <button key={tag} type="button"
                          onClick={() => { const c = form.examTags || []; setForm((f: any) => ({ ...f, examTags: sel ? c.filter((t: string) => t !== tag) : [...c, tag] })) }}
                          className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-all ${sel ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'}`}>
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Visible to students</label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-100">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
                <button onClick={save} disabled={saving || frontUploading || backUploading} className="flex-1 btn-primary disabled:opacity-50">
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
