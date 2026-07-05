'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import DynamicSelect from '@/components/ui/DynamicSelect'
import RichTextEditor, { CaToolbar, CaEditorField, CaEditorStyles, type ActiveCaEditor } from '@/components/ui/RichTextEditor'
import RichContentView from '@/components/ui/RichContentView'
import {
  Plus, Search, RefreshCw, Edit, Trash2, Eye, X,
  ChevronLeft, ChevronRight, Filter, Calendar,
  Star, Tag, BookOpen, Newspaper, Loader2, Percent,
} from 'lucide-react'

const CATEGORIES = ['General','Economy','Polity','Science & Tech','Environment','International','Bihar','Sports','Defence','Awards']
const EMPTY_FORM = { title:'', summary:'', detail:'', keyPoints:'', examRelevance:'', importantFacts:'', category:'General', categories:['General'] as string[], type:'prelims', examTags:[] as string[], isImportant:false, publishDate:'', status:'draft', readTime:1, mcqNegativeMarkingOverride: null as boolean | null, mcqMarksPerCorrectOverride: 1, mcqMarksPerWrongOverride: 0.33 }
const OPTION_LABELS = ['A','B','C','D','E']
const LIMIT = 20

// Plain-text fallback for list-card previews and as a safety-net summary
// when the admin leaves the Summary field blank.
const stripHtml = (html?: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

// Issue 8: dynamic option count for MCQs
const emptyMcqForm = (optCount = 4) => ({
  question: '', options: Array(optCount).fill('') as string[],
  correct: 0, hint: '', explanation: '', optionCount: optCount,
  questionSubtype: 'standard' as 'standard'|'match',
  matchList1: [{ label:'A', text:'' }, { label:'B', text:'' }, { label:'C', text:'' }, { label:'D', text:'' }],
  matchList2: [{ label:'1', text:'' }, { label:'2', text:'' }, { label:'3', text:'' }, { label:'4', text:'' }],
})

function MatchMcqEditor({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const updateList1 = (idx: number, text: string) => {
    const updated = form.matchList1.map((item: any, i: number) => i === idx ? { ...item, text } : item)
    setForm({ ...form, matchList1: updated })
  }
  const updateList2 = (idx: number, text: string) => {
    const updated = form.matchList2.map((item: any, i: number) => i === idx ? { ...item, text } : item)
    setForm({ ...form, matchList2: updated })
  }
  return (
    <div className="p-5 space-y-3 border-b border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Match Lists</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">List-I</p>
          {form.matchList1.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold shrink-0">{item.label}</span>
              <input value={item.text} onChange={e => updateList1(idx, e.target.value)}
                placeholder={`Item ${item.label}…`} className="input flex-1 text-sm" />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">List-II</p>
          {form.matchList2.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">{item.label}</span>
              <input value={item.text} onChange={e => updateList2(idx, e.target.value)}
                placeholder={`Item ${item.label}…`} className="input flex-1 text-sm" />
            </div>
          ))}
        </div>
      </div>
      {(form.matchList1.some((i: any) => i.text) || form.matchList2.some((i: any) => i.text)) && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 mb-1.5">Preview</p>
          <div className="space-y-1">
            {form.matchList1.filter((i: any) => i.text).map((item: any, idx: number) => {
              const pair = form.matchList2[idx]
              return (
                <div key={idx} className="flex gap-1 text-xs text-slate-700">
                  <span className="font-bold text-blue-600">{item.label}.</span>
                  <span>{item.text}</span>
                  <span className="text-slate-400 mx-1">↔</span>
                  <span className="font-bold text-emerald-600">{pair?.label}.</span>
                  <span>{pair?.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CurrentAffairsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}><Inner /></Suspense>
}

function Inner() {
  const searchParams = useSearchParams()
  const { showToast, ToastComponent } = useToast()

  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCat]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  // Filtered counts — all derived from the same API response as the grid (single source of truth)
  const [counts, setCounts]     = useState({ prelims: 0, mains: 0, important: 0 })
  const debouncedSearch         = useDebounce(search, 400)

  // Create/edit modal
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  // Tracks which editor field is currently focused so the shared CaToolbar
  // operates on the right editor instance.
  const [activeEditor, setActiveEditor] = useState<ActiveCaEditor>(null)

  // Preview modal
  const [preview, setPreview] = useState<any>(null)

  // MCQ modal
  const [mcqAffair, setMcqAffair]   = useState<any>(null)
  const [mcqs, setMcqs]             = useState<any[]>([])
  const [mcqLoading, setMcqLoading] = useState(false)
  const [mcqForm, setMcqForm]       = useState<any>(emptyMcqForm(4))
  const [editingMcq, setEditingMcq] = useState<any>(null)
  const [mcqSaving, setMcqSaving]   = useState(false)

  // Global negative marking config — applies to every CA / Practice MCQ
  // practice session in the app (these are lightweight article-attached
  // questions, not per-test records, so one global toggle covers them).
  const [showMcqConfig, setShowMcqConfig]   = useState(false)
  const [mcqConfig, setMcqConfig]           = useState({ negativeMarkingEnabled: false, marksPerCorrect: 1, marksPerWrong: 0 })
  const [mcqConfigLoading, setMcqConfigLoading] = useState(false)
  const [mcqConfigSaving, setMcqConfigSaving]   = useState(false)

  const openMcqConfig = async () => {
    setShowMcqConfig(true)
    setMcqConfigLoading(true)
    try {
      const res = await api.currentAffairs.getMcqConfig()
      if (res.data?.config) setMcqConfig(res.data.config)
    } catch (e: any) { showToast(e.message || 'Failed to load settings', 'error') }
    finally { setMcqConfigLoading(false) }
  }

  const saveMcqConfig = async () => {
    setMcqConfigSaving(true)
    try {
      await api.currentAffairs.updateMcqConfig(mcqConfig)
      showToast('Negative marking settings updated ✅')
      setShowMcqConfig(false)
    } catch (e: any) { showToast(e.message || 'Failed to save', 'error') }
    finally { setMcqConfigSaving(false) }
  }

  // Issue 3: debounced search wired to load
  // Single source of truth — stats come from the SAME request as the grid,
  // so Total/Prelims/Mains/Important always match exactly what's visible.
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.currentAffairs.list({
        search: debouncedSearch,
        category: catFilter,
        exam: typeFilter || undefined,
        page,
        limit: LIMIT,
      })
      setList(res.data?.affairs || [])
      setTotal(res.meta?.total ?? res.data?.total ?? 0)
      // counts now come from the backend alongside the same filtered result
      if (res.data?.counts) {
        setCounts({
          prelims:   res.data.counts.prelims   ?? 0,
          mains:     res.data.counts.mains     ?? 0,
          important: res.data.counts.important ?? 0,
        })
      }
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { setPage(1) }, [debouncedSearch, catFilter, typeFilter])
  useEffect(() => { load() }, [debouncedSearch, catFilter, typeFilter, page])

  const openMcqs = async (item: any) => {
    setMcqAffair(item); setMcqs([]); setMcqLoading(true); setEditingMcq(null); setMcqForm(emptyMcqForm(4))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/current-affairs/${item.id}/mcqs`, {
        credentials: 'include',
      })
      setMcqs((await res.json()).data?.mcqs || [])
    } catch { setMcqs([]) }
    setMcqLoading(false)
  }

  const saveMcq = async () => {
    if (!mcqForm.question.trim() || mcqForm.options.filter(Boolean).length < 2) {
      showToast('Question and at least 2 options are required', 'error'); return
    }
    setMcqSaving(true)
    try {
      // Backend expects: correct as letter 'a'/'b'/'c'/'d', optionA-D as strings
      const correctLetter = ['a','b','c','d','e'][Math.min(mcqForm.correct ?? 0, 4)]
      const opts = mcqForm.options as string[]

      const isMatch = mcqForm.questionSubtype === 'match'
      const payload = {
        question:        mcqForm.question.trim(),
        correct:         correctLetter,
        hint:            mcqForm.hint?.trim()        || '',
        explanation:     mcqForm.explanation?.trim() || '',
        optionA:         opts[0]?.trim() || '',
        optionB:         opts[1]?.trim() || '',
        optionC:         opts[2]?.trim() || '',
        optionD:         opts[3]?.trim() || '',
        optionE:         opts[4]?.trim() || '',
        questionSubtype: isMatch ? 'match' : 'standard',
        matchData:       isMatch ? {
          list1: mcqForm.matchList1.filter((item: any) => item.text.trim()),
          list2: mcqForm.matchList2.filter((item: any) => item.text.trim()),
        } : null,
      }

      const base = process.env.NEXT_PUBLIC_API_URL
      const url  = editingMcq
        ? `${base}/admin/current-affairs/mcqs/${editingMcq.id}`
        : `${base}/admin/current-affairs/${mcqAffair.id}/mcqs`

      const res = await fetch(url, {
        method:      editingMcq ? 'PUT' : 'POST',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
        credentials: 'include',
      })

      // Check for HTTP errors — fetch doesn't throw on 4xx/5xx
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(err.message || `Request failed (${res.status})`)
      }

      showToast(editingMcq ? 'MCQ updated ✅' : 'MCQ added ✅')
      setEditingMcq(null)
      setMcqForm(emptyMcqForm(4))  // reset to blank form
      // Reload MCQ list
      const res2 = await fetch(`${base}/admin/current-affairs/${mcqAffair.id}/mcqs`, {
        credentials: 'include',
      })
      setMcqs((await res2.json()).data?.mcqs || [])
    } catch (e: any) {
      showToast(e.message || 'Failed to save MCQ', 'error')
    } finally {
      setMcqSaving(false)
    }
  }

  const deleteMcq = async (id: string) => {
    if (!confirm('Delete this MCQ?')) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/current-affairs/mcqs/${id}`, {
        method:      'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMcqs(p => p.filter(m => m.id !== id))
      showToast('MCQ deleted')
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', 'error')
    }
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setActiveEditor(null); setShowModal(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      title:   item.title, summary: item.summary||'', detail: item.full_content||item.fullContent||'',
      keyPoints:      item.key_points      || '',
      examRelevance:  item.exam_relevance  || '',
      importantFacts: item.important_facts || '',
      category: item.category,
      categories: (item.categories?.length ? item.categories : (item.category ? [item.category] : [])) as string[],
      type: item.type||(item.exam_tags?.find((t:string)=>['prelims','mains','both'].includes(t))||'prelims'),
      examTags: item.exam_tags||[], isImportant: item.is_important||false,
      publishDate: item.date?.split('T')[0]||'', status: item.status||'draft', readTime: item.read_time||1,
      // Per-article MCQ override — null means "inherit global setting"
      mcqNegativeMarkingOverride:   item.mcq_negative_marking_override  ?? null,
      mcqMarksPerCorrectOverride:   item.mcq_marks_per_correct_override != null ? Number(item.mcq_marks_per_correct_override) : 1,
      mcqMarksPerWrongOverride:     item.mcq_marks_per_wrong_override   != null ? Number(item.mcq_marks_per_wrong_override)   : 0.33,
    })
    setActiveEditor(null)
    setShowModal(true)
  }

  const save = async () => {
    if (!stripHtml(form.title).trim()) { showToast('Title is required', 'error'); return }
    setSaving(true)
    try {
      // Summary feeds push notifications/share text — fall back to a
      // plain-text snippet from full content if left blank. Even when the
      // admin types into the rich summary field we send the HTML — the
      // backend sanitizer keeps it inline-only; the Android side uses
      // stripHtml() for notification/share payloads.
      const summary = form.summary.trim() || stripHtml(form.detail).slice(0, 200)
      const payload: any = {
        title: form.title, summary, fullContent: form.detail,
        keyPoints:      form.keyPoints      || null,
        examRelevance:  form.examRelevance  || null,
        importantFacts: form.importantFacts || null,
        category: form.categories[0] || form.category, categories: form.categories,
        type: form.type, examTags: form.examTags,
        isImportant: form.isImportant, date: form.publishDate, status: form.status, readTime: Number(form.readTime)||1,
      }
      // Only send override fields on edit — new articles always inherit
      // global until an admin explicitly configures an override.
      if (editing) {
        payload.mcqNegativeMarkingOverride  = form.mcqNegativeMarkingOverride  // null = clear override
        payload.mcqMarksPerCorrectOverride  = form.mcqNegativeMarkingOverride != null ? form.mcqMarksPerCorrectOverride  : undefined
        payload.mcqMarksPerWrongOverride    = form.mcqNegativeMarkingOverride != null ? form.mcqMarksPerWrongOverride    : undefined
      }
      if (editing) await api.currentAffairs.update(editing.id, payload)
      else         await api.currentAffairs.create(payload)
      setShowModal(false); load(); showToast(editing ? 'Updated ✅' : 'Created ✅')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title.slice(0,60)}…"?`)) return
    try { await api.currentAffairs.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Current Affairs" subtitle="Manage daily current affairs for Prelims and Mains" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'📰', label:'Total',     value:total,             color:'text-slate-700',  bg:'bg-slate-50' },
            { emoji:'🎯', label:'Prelims',   value:counts.prelims,    color:'text-green-700',  bg:'bg-green-50' },
            { emoji:'📝', label:'Mains',     value:counts.mains,      color:'text-purple-700', bg:'bg-purple-50' },
            { emoji:'⭐', label:'Important', value:counts.important,  color:'text-amber-700',  bg:'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters — Issue 3+4: debounced search + styled selects */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search headlines…" className="input pl-9" />
          </div>
          <div className="min-w-44 flex-shrink-0">
            <DynamicSelect type="affair-categories" value={catFilter} onChange={v => { setCat(v); setPage(1) }} placeholder="All Categories" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <BookOpen size={12} className="text-slate-400" />
            <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="">All Types</option>
              <option value="prelims">Prelims</option>
              <option value="mains">Mains</option>
              <option value="both">Both</option>
            </select>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2" title="Refresh"><RefreshCw size={13} /></button>
          <button onClick={openMcqConfig} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold transition-colors" title="Negative marking for MCQs">
            <Percent size={14} /> MCQ Marking
          </button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Affair</button>
        </div>

        {/* Quiz-style card grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-3 bg-slate-100 rounded w-1/3"/>
                <div className="h-4 bg-slate-100 rounded w-full"/>
                <div className="h-3 bg-slate-100 rounded w-2/3"/>
                <div className="h-10 bg-slate-100 rounded"/>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card p-16 text-center">
            <Newspaper size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No current affairs found</p>
            <p className="text-sm text-slate-400 mb-4">Try adjusting your search or filters</p>
            <button onClick={openNew} className="btn-primary mx-auto"><Plus size={14}/> Add Current Affair</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(item => (
              <div key={item.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                {/* Type colour bar */}
                <div className={`h-1 w-full ${
                  (() => {
                    const t = item.type || (item.exam_tags?.find((tag: string) => ['prelims','mains','both'].includes(tag)) || 'prelims')
                    return t==='mains' ? 'bg-purple-300' : t==='both' ? 'bg-blue-300' : 'bg-green-300'
                  })()
                }`}/>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Derive type from exam_tags[0] if type field missing */}
                    {(() => {
                      const t = item.type || (item.exam_tags && ['prelims','mains','both'].includes(item.exam_tags[0]) ? item.exam_tags[0] : 'prelims')
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
                          ${t==='mains' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            t==='both'  ? 'bg-blue-50 text-blue-700 border-blue-200'       :
                            'bg-green-50 text-green-600 border-green-100'}`}>
                          {t}
                        </span>
                      )
                    })()}
                    {(item.categories?.length ? item.categories : (item.category ? [item.category] : [])).map((c: string) => (
                      <span key={c} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {c}
                      </span>
                    ))}
                    {item.is_important && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⭐ Important
                      </span>
                    )}
                  </div>

                  {/* Title — now rich HTML since headline supports inline marks */}
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: item.title }} />

                  {/* Stats mini-grid — matches quiz cards */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="flex flex-col items-center py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                      <span className="text-slate-400 mb-0.5 text-[11px]">❓</span>
                      <span className="text-xs font-black text-slate-800">{item.mcq_count ?? 0}</span>
                      <span className="text-[9px] text-slate-400">MCQs</span>
                    </div>
                    <div className="flex flex-col items-center py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                      <span className="text-slate-400 mb-0.5 text-[11px]">📅</span>
                      <span className="text-xs font-black text-slate-800">
                        {item.date ? new Date(item.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                      </span>
                      <span className="text-[9px] text-slate-400">Date</span>
                    </div>
                    <div className="flex flex-col items-center py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                      <span className="text-slate-400 mb-0.5 text-[11px]">👁️</span>
                      <span className="text-xs font-black text-slate-800">{item.view_count ?? 0}</span>
                      <span className="text-[9px] text-slate-400">Views</span>
                    </div>
                  </div>

                  {/* Summary preview — plain text strip for card compact display */}
                  {(item.summary || item.full_content) && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {stripHtml(item.summary) || stripHtml(item.full_content)}
                    </p>
                  )}

                  <div className="flex-1"/>

                  {/* Actions — labelled buttons like quizzes */}
                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <button onClick={() => setPreview(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors">
                      <Eye size={12}/> Preview
                    </button>
                    <button onClick={() => openMcqs(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors">
                      ❓ MCQs{item.mcq_count > 0 ? ` (${item.mcq_count})` : ''}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors" title="Edit">
                      <Edit size={13} className="text-amber-600"/>
                    </button>
                    <button onClick={() => del(item.id, item.title)}
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 size={13} className="text-red-600"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Showing <b>{Math.min((page-1)*LIMIT+1,total)}</b>–<b>{Math.min(page*LIMIT,total)}</b> of <b>{total}</b>
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold text-sm">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>{const p=totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;return<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>})}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
              <button disabled={page>=totalPages} onClick={()=>setPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold text-sm">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ CREATE / EDIT — FULL SCREEN PANEL ══════════════════
          Replacing the old max-w-2xl dialog. Rationale:
          • The full-content TipTap editor needs vertical room; inside a
            92vh modal it scrolls awkwardly and the toolbar clips near the edge.
          • With Headline + Summary now also being rich fields, having a
            shared toolbar that floats above all three simultaneously is much
            cleaner than embedding three separate toolbars in a small dialog.
          • Pattern is the same as the MCQ page's full-screen add/edit flow.
      ══════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <CaEditorStyles />

          {/* Top bar */}
          <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <ChevronLeft size={16} className="text-white"/>
              </button>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">{editing ? 'Edit Article' : 'New Article'}</h3>
                <p className="text-white/60 text-[11px]">Click into any field, then use the toolbar to format it</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl overflow-hidden border border-white/30 text-xs font-semibold">
                {(['draft','published'] as const).map(s => (
                  <button key={s} onClick={() => setForm((f:any) => ({...f, status: s}))}
                    className={`px-3 py-1.5 transition-colors
                      ${form.status === s
                        ? s === 'published' ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                    {s === 'published' ? '✅ Publish' : '📝 Draft'}
                  </button>
                ))}
              </div>
              <button onClick={save} disabled={saving || !stripHtml(form.title).trim()} className="btn-primary disabled:opacity-40 bg-white text-brand-700 hover:bg-white/90 text-sm px-4 py-1.5">
                {saving ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>

          {/* Shared formatting toolbar — sticky below the top bar */}
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 shadow-sm">
            <CaToolbar active={activeEditor} />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

              {/* Three editor fields — each calls setActiveEditor on focus */}
              <CaEditorField
                mode="inlineSingleLine"
                label="Headline *"
                value={form.title}
                onChange={html => setForm((f:any) => ({...f, title: html}))}
                placeholder="e.g. India signs trade agreement with…"
                onActivate={setActiveEditor}
              />

          

              <CaEditorField
                mode="inline"
                label="Summary"
                hint="(short blurb — list cards, share text, notifications)"
                value={form.summary}
                onChange={html => setForm((f:any) => ({...f, summary: html}))}
                placeholder="One or two sentences. Leave blank to auto-generate from the full article."
                onActivate={setActiveEditor}
              />

                   {/* ── New content fields ── */}
              <CaEditorField
                mode="full"
                label="Key Points"
                hint="(bullet-form takeaways for quick revision)"
                value={form.keyPoints}
                onChange={html => setForm((f:any) => ({...f, keyPoints: html}))}
                placeholder="• Use bullet lists here — one key takeaway per point…"
                uploadImage={async (file) => { const res = await api.currentAffairs.uploadImage(file); return res.data?.url }}
                onActivate={setActiveEditor}
              />

              <CaEditorField
                mode="full"
                label="Exam Relevance"
                hint="(which exam and paper, why it matters)"
                value={form.examRelevance}
                onChange={html => setForm((f:any) => ({...f, examRelevance: html}))}
                placeholder="BPSC Prelims GS Paper I — Topic: Economy. This article is important because…"
                uploadImage={async (file) => { const res = await api.currentAffairs.uploadImage(file); return res.data?.url }}
                onActivate={setActiveEditor}
              />


              <CaEditorField
                mode="full"
                label="Full Article Content"
                value={form.detail}
                onChange={html => setForm((f:any) => ({...f, detail: html}))}
                placeholder="Full analysis for Mains preparation… use the toolbar for headings, tables, images and more."
                uploadImage={async (file) => {
                  const res = await api.currentAffairs.uploadImage(file)
                  return res.data?.url
                }}
                onActivate={setActiveEditor}
              />

             
              <CaEditorField
                mode="full"
                label="Important Facts &amp; Figures"
                hint="(specific numbers, names, dates to memorise)"
                value={form.importantFacts}
                onChange={html => setForm((f:any) => ({...f, importantFacts: html}))}
                placeholder="₹2.5 lakh crore allocated to infrastructure in Union Budget 2025–26…"
                uploadImage={async (file) => { const res = await api.currentAffairs.uploadImage(file); return res.data?.url }}
                onActivate={setActiveEditor}
              />

              {/* ── Metadata ── */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Article Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Categories</label>
                    {form.categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {form.categories.map((c: string) => (
                          <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                            {c}
                            <button type="button" onClick={() => setForm((f:any) => ({...f, categories: f.categories.filter((x: string) => x !== c)}))}
                              className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none" aria-label={`Remove ${c}`}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <DynamicSelect type="affair-categories" value="" onChange={v => v && setForm((f:any) => ({...f, categories: f.categories?.includes(v) ? f.categories : [...(f.categories || []), v]}))} placeholder="+ Add category" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Type</label>
                    <select value={form.type} onChange={e => setForm((f:any) => ({...f,type:e.target.value}))} className="input w-full">
                      <option value="prelims">Prelims</option>
                      <option value="mains">Mains</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Publish Date</label>
                    <input type="date" value={form.publishDate} onChange={e => setForm((f:any) => ({...f,publishDate:e.target.value}))} className="input w-full"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Read Time <span className="text-slate-400 font-normal">(minutes)</span></label>
                    <input type="number" min={1} max={60} value={form.readTime} onChange={e => setForm((f:any) => ({...f,readTime:parseInt(e.target.value)||1}))} className="input w-full" placeholder="e.g. 3"/>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none"
                  onClick={() => setForm((f:any) => ({...f,isImportant:!f.isImportant}))}>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isImportant?'bg-amber-400':'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isImportant?'translate-x-5':'translate-x-0.5'}`}/>
                  </div>
                  <span className="text-sm font-medium text-slate-700">⭐ Mark Important</span>
                </label>
              </div>

              {/* ── Per-article MCQ Marking Override ── */}
              {editing && (
                <div className="border border-red-100 bg-red-50/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">⚠️ MCQ Marking Override</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Override the global setting just for this article's MCQs. Leave off to inherit global.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => setForm((f:any) => ({
                        ...f,
                        mcqNegativeMarkingOverride: f.mcqNegativeMarkingOverride === null ? false : null
                      }))}>
                      <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.mcqNegativeMarkingOverride !== null ? 'bg-red-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.mcqNegativeMarkingOverride !== null ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{form.mcqNegativeMarkingOverride !== null ? 'Override active' : 'Inherit global'}</span>
                    </label>
                  </div>
                  {form.mcqNegativeMarkingOverride !== null && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => setForm((f:any) => ({...f, mcqNegativeMarkingOverride: !f.mcqNegativeMarkingOverride}))}>
                        <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${form.mcqNegativeMarkingOverride ? 'bg-red-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.mcqNegativeMarkingOverride ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                        </div>
                        <span className="text-xs text-slate-600">Enable negative marking for this article</span>
                      </label>
                      {form.mcqNegativeMarkingOverride && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">✅ Marks / Correct</label>
                            <input type="number" step={0.25} min={0.25} value={form.mcqMarksPerCorrectOverride}
                              onChange={e => setForm((f:any) => ({...f, mcqMarksPerCorrectOverride: +e.target.value || 1}))}
                              className="input w-full" placeholder="1"/>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">❌ Marks / Wrong</label>
                            <input type="number" step={0.01} min={0} value={form.mcqMarksPerWrongOverride}
                              onChange={e => setForm((f:any) => ({...f, mcqMarksPerWrongOverride: +e.target.value || 0}))}
                              className="input w-full" placeholder="0.33"/>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ PREVIEW MODAL ══════════════════ */}
      {/* Issue 6: Better preview with more details */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Color header based on type */}
            <div className={`px-6 py-4 ${preview.type==='mains'?'bg-purple-600':preview.type==='both'?'bg-blue-600':'bg-green-600'} shrink-0`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {(preview.categories?.length ? preview.categories : (preview.category ? [preview.category] : [])).map((c: string) => (
                    <span key={c} className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full">{c}</span>
                  ))}
                  <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full capitalize">{preview.type}</span>
                  {preview.is_important && <span className="px-2.5 py-1 bg-amber-400/30 text-white text-xs font-bold rounded-full">⭐ Important</span>}
                </div>
                <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0">
                  <X size={14} className="text-white"/>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 leading-snug" dangerouslySetInnerHTML={{ __html: preview.title }} />

              {preview.date && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar size={12}/>
                  {new Date(preview.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </div>
              )}

              {preview.summary && (
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</p>
                  <RichContentView html={preview.summary} />
                </div>
              )}

              {(preview.full_content || preview.fullContent || preview.detail) && (
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Article</p>
                  <RichContentView html={preview.full_content || preview.fullContent || preview.detail} />
                </div>
              )}

              {(preview.exam_tags||[]).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Relevant Exams</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.exam_tags.map((t:string) => (
                      <span key={t} className="badge bg-brand-50 text-brand-700 border-brand-200">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => { setPreview(null); openEdit(preview) }} className="flex-1 btn-secondary text-sm">
                <Edit size={13}/> Edit
              </button>
              <button onClick={() => { setPreview(null); openMcqs(preview) }} className="flex-1 btn-primary text-sm">
                Add MCQs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ MCQ MODAL ══════════════════ */}
      {mcqAffair && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">

            <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">MCQs — {mcqAffair.title?.slice(0,55)}{mcqAffair.title?.length > 55 ? '…' : ''}</h3>
                <p className="text-white/60 text-xs mt-0.5">Add, edit or delete multiple-choice questions</p>
              </div>
              <button onClick={() => setMcqAffair(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>
            {/* ── Full-page 2-column body ── */}
            <div className="flex flex-1 overflow-hidden">

              {/* LEFT COLUMN — Question editor */}
              <div className="flex flex-col flex-1 min-w-0 overflow-y-auto border-r border-slate-100 bg-white">
                {/* Form toolbar */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-slate-800">
                      {editingMcq ? '✏️ Edit Question' : '➕ New Question'}
                    </span>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-medium mr-1">Options:</span>
                      {[2,3,4,5].map((n: number) => (
                        <button key={n} onClick={() => {
                          const opts = Array(n).fill('').map((_:any,i:number) => mcqForm.options[i] || '')
                          const correct = (mcqForm.correct||0) >= n ? 0 : (mcqForm.correct||0)
                          setMcqForm({...mcqForm, options:opts, optionCount:n, correct})
                        }} className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors
                          ${(mcqForm.optionCount||4)===n?'bg-purple-600 text-white':'text-slate-500 hover:bg-purple-100'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingMcq && (
                      <button onClick={() => { setEditingMcq(null); setMcqForm(emptyMcqForm(mcqForm.optionCount)) }}
                        className="btn-secondary text-sm px-4">Cancel</button>
                    )}
                    <button onClick={saveMcq} disabled={mcqSaving || !mcqForm.question.trim()}
                      className="btn-primary text-sm px-5 disabled:opacity-40">
                      {mcqSaving ? <><Loader2 size={13} className="animate-spin mr-1 inline"/>Saving…</> : editingMcq ? 'Update' : 'Save MCQ'}
                    </button>
                  </div>
                </div>

                {/* Question rich-text editor */}
                <div className="flex-1 p-6 flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">
                    Question <span className="text-red-500">*</span>
                    <span className="font-normal text-slate-400 ml-1">— type, or paste a table from any website / Google Sheets</span>
                  </label>
                  <div className="[&_.ca-editor-content]:min-h-[400px]">
                    <RichTextEditor
                    value={mcqForm.question}
                    onChange={(html: string) => setMcqForm((f: any) => ({ ...f, question: html }))}
                    placeholder="Type the question here. Use the ⊞ table button in the toolbar to insert a table, or paste one from any website." uploadImage={function (file: File): Promise<string> {
                      throw new Error('Function not implemented.')
                    } }                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — Options, Hint, Explanation, list */}
              <div className="w-[380px] shrink-0 flex flex-col overflow-y-auto bg-slate-50">

                {/* Question subtype toggle */}
                <div className="p-5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Question Type</p>
                  <div className="flex gap-2">
                    {(['standard','match'] as const).map(t => (
                      <button key={t} onClick={() => setMcqForm({...mcqForm, questionSubtype: t})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mcqForm.questionSubtype === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                        {t === 'standard' ? '📝 Standard MCQ' : '🔗 Match the Following'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match data editor (only for match type) */}
                {mcqForm.questionSubtype === 'match' && (
                  <MatchMcqEditor form={mcqForm} setForm={setMcqForm} />
                )}

                {/* Options */}
                <div className="p-5 space-y-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    {mcqForm.questionSubtype === 'match' ? 'Combination Options (A–D)' : 'Answer Options'}
                  </p>
                  {(mcqForm.options || []).map((opt: string, oi: number) => (
                    <div key={oi} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-colors
                      ${mcqForm.correct===oi?'border-green-400 bg-green-50':'border-transparent bg-white shadow-sm'}`}>
                      <button onClick={() => setMcqForm({...mcqForm,correct:oi})}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors
                          ${mcqForm.correct===oi?'bg-green-500 text-white':'bg-slate-100 text-slate-500 hover:bg-green-100 border-2 border-slate-200'}`}>
                        {OPTION_LABELS[oi]}
                      </button>
                      <input value={opt} onChange={e => {
                        const opts = [...mcqForm.options]; opts[oi] = e.target.value
                        setMcqForm({...mcqForm,options:opts})
                      }} className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                        placeholder={`Option ${OPTION_LABELS[oi]}…`}/>
                      {mcqForm.correct === oi && <span className="text-[10px] font-bold text-green-600 shrink-0">✓ Correct</span>}
                    </div>
                  ))}
                </div>

                {/* Hint */}
                <div className="p-5 space-y-1.5 border-b border-slate-100">
                  <label className="text-xs font-bold text-amber-700">
                    💡 Hint <span className="font-normal text-slate-400">(shown while attempting)</span>
                  </label>
                  <textarea value={mcqForm.hint || ''} onChange={e => setMcqForm({...mcqForm, hint: e.target.value})}
                    className="input w-full resize-y text-sm" rows={3}
                    placeholder="Optional nudge before the student answers…" />
                </div>

                {/* Explanation */}
                <div className="p-5 space-y-1.5 border-b border-slate-100">
                  <label className="text-xs font-bold text-green-700">
                    📖 Explanation <span className="font-normal text-slate-400">(shown after answering)</span>
                  </label>
                  <textarea value={mcqForm.explanation || ''} onChange={e => setMcqForm({...mcqForm, explanation: e.target.value})}
                    className="input w-full resize-y text-sm" rows={4}
                    placeholder="Full reasoning for why the correct answer is right…" />
                </div>

              {/* Existing MCQs list */}
              <div className="p-5 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {mcqs.length > 0 ? `${mcqs.length} MCQ${mcqs.length > 1 ? 's' : ''} added` : 'No MCQs yet'}
                </p>
              {mcqLoading ? (
                <div className="py-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></div>
              ) : mcqs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-2xl mb-2">❓</p>
                  <p className="text-sm">Add the first question using the editor on the left</p>
                </div>
              ) : mcqs.map((mcq, i) => (
                <div key={mcq.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-slate-800 line-clamp-2">{i+1}. {mcq.question?.replace(/<[^>]+>/g,'').slice(0,100)}{(mcq.question?.replace(/<[^>]+>/g,'').length > 100) ? '…' : ''}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => {
                        setEditingMcq(mcq)
                        const opts = [mcq.option_a,mcq.option_b,mcq.option_c,mcq.option_d,mcq.option_e].filter(Boolean)
                        const correctIdx = ['a','b','c','d','e'].indexOf(mcq.correct||'a')
                        const ml1 = mcq.match_data?.list1 || [{ label:'A', text:'' }, { label:'B', text:'' }, { label:'C', text:'' }, { label:'D', text:'' }]
                        const ml2 = mcq.match_data?.list2 || [{ label:'1', text:'' }, { label:'2', text:'' }, { label:'3', text:'' }, { label:'4', text:'' }]
                        setMcqForm({question:mcq.question,options:opts,correct:correctIdx>=0?correctIdx:0,hint:mcq.hint||'',explanation:mcq.explanation||'',optionCount:opts.length,questionSubtype:mcq.question_subtype||'standard',matchList1:ml1,matchList2:ml2})
                      }} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                        <Edit size={12} className="text-amber-600"/>
                      </button>
                      <button onClick={() => deleteMcq(mcq.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={12} className="text-red-600"/>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {['a','b','c','d','e'].map(l => mcq[`option_${l}`] && (
                      <div key={l} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs
                        ${mcq.correct===l?'bg-green-100 text-green-800 font-semibold border border-green-200':'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
                          ${mcq.correct===l?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}`}>
                          {l.toUpperCase()}
                        </span>
                        {mcq[`option_${l}`]}
                      </div>
                    ))}
                  </div>
                  {mcq.hint        && <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-2.5 py-1.5 rounded-lg">💡 <span className="font-semibold">Hint:</span> {mcq.hint}</p>}
                  {mcq.explanation && <p className="text-xs text-blue-600  mt-1 bg-blue-50  px-2.5 py-1.5 rounded-lg">📖 <span className="font-semibold">Explanation:</span> {mcq.explanation}</p>}
                </div>
              ))}
              </div>
              </div>{/* end right column */}
            </div>{/* end 2-column wrapper */}
      </div>
)}

      {/* ════════════════ NEGATIVE MARKING CONFIG MODAL ════════════════ */}
      {showMcqConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMcqConfig(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-rose-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">MCQ Negative Marking</h3>
                <p className="text-white/70 text-xs mt-0.5">Applies to all Current Affairs & Practice MCQs</p>
              </div>
              <button onClick={() => setShowMcqConfig(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {mcqConfigLoading ? (
                <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin"/> Loading…</div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    These article-attached practice MCQs aren't created like a full test, so this single switch controls negative marking for all of them at once — separate from the per-test settings on the Quizzes page.
                  </p>
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none"
                      onClick={() => setMcqConfig(c => ({ ...c, negativeMarkingEnabled: !c.negativeMarkingEnabled }))}>
                      <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${mcqConfig.negativeMarkingEnabled ? 'bg-red-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mcqConfig.negativeMarkingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                      </div>
                      <span className="text-sm font-bold text-slate-700">⚠️ Enable Negative Marking</span>
                    </label>
                  </div>
                  {mcqConfig.negativeMarkingEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">✅ Marks / Correct</label>
                        <input type="number" step={0.25} min={0.25} value={mcqConfig.marksPerCorrect}
                          onChange={e => setMcqConfig(c => ({ ...c, marksPerCorrect: +e.target.value || 1 }))}
                          className="input w-full" placeholder="1" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">❌ Marks / Wrong</label>
                        <input type="number" step={0.01} min={0} value={mcqConfig.marksPerWrong}
                          onChange={e => setMcqConfig(c => ({ ...c, marksPerWrong: +e.target.value || 0 }))}
                          className="input w-full" placeholder="0.25" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowMcqConfig(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveMcqConfig} disabled={mcqConfigSaving || mcqConfigLoading} className="btn-primary disabled:opacity-40">
                {mcqConfigSaving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}