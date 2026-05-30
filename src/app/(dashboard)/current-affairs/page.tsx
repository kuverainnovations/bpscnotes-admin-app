'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import {
  Plus, Search, RefreshCw, Edit, Trash2, Eye, X,
  ChevronLeft, ChevronRight, Filter, Calendar,
  Star, Tag, BookOpen, Newspaper, Loader2,
} from 'lucide-react'

const CATEGORIES = ['General','Economy','Polity','Science & Tech','Environment','International','Bihar','Sports','Defence','Awards']
const EMPTY_FORM = { title:'', detail:'', category:'General', type:'prelims', examTags:[] as string[], isImportant:false, publishDate:'', status:'draft' }
const OPTION_LABELS = ['A','B','C','D','E']
const LIMIT = 20

// Issue 8: dynamic option count for MCQs
const emptyMcqForm = (optCount = 4) => ({
  question: '', options: Array(optCount).fill('') as string[],
  correct: 0, explanation: '', optionCount: optCount,
})

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
  const debouncedSearch         = useDebounce(search, 400)

  // Create/edit modal
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)

  // Preview modal
  const [preview, setPreview] = useState<any>(null)

  // MCQ modal
  const [mcqAffair, setMcqAffair]   = useState<any>(null)
  const [mcqs, setMcqs]             = useState<any[]>([])
  const [mcqLoading, setMcqLoading] = useState(false)
  const [mcqForm, setMcqForm]       = useState<any>(emptyMcqForm(4))
  const [editingMcq, setEditingMcq] = useState<any>(null)
  const [mcqSaving, setMcqSaving]   = useState(false)

  // Issue 3: debounced search wired to load
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.currentAffairs.list({
        search: debouncedSearch,
        category: catFilter,
        page,
        limit: LIMIT,
      })
      setList(res.data?.affairs || [])
      setTotal(res.meta?.total ?? res.data?.total ?? 0)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { setPage(1) }, [debouncedSearch, catFilter, typeFilter])
  useEffect(() => { load() }, [debouncedSearch, catFilter, typeFilter, page])

  const openMcqs = async (item: any) => {
    setMcqAffair(item); setMcqs([]); setMcqLoading(true); setEditingMcq(null); setMcqForm(emptyMcqForm(4))
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/current-affairs/${item.id}/mcqs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
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

      const payload = {
        question:    mcqForm.question.trim(),
        correct:     correctLetter,           // letter, not index
        explanation: mcqForm.explanation?.trim() || '',
        optionA:     opts[0]?.trim() || '',   // required NOT NULL
        optionB:     opts[1]?.trim() || '',   // required NOT NULL
        optionC:     opts[2]?.trim() || '',   // empty string OK
        optionD:     opts[3]?.trim() || '',   // empty string OK
        optionE:     opts[4]?.trim() || '',   // 5th option if selected
      }

      const base  = process.env.NEXT_PUBLIC_API_URL
      const token = localStorage.getItem('adminToken')
      const url   = editingMcq
        ? `${base}/admin/current-affairs/mcqs/${editingMcq.id}`
        : `${base}/admin/current-affairs/${mcqAffair.id}/mcqs`

      const res = await fetch(url, {
        method: editingMcq ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      // Check for HTTP errors — fetch doesn't throw on 4xx/5xx
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(err.message || `Request failed (${res.status})`)
      }

      showToast(editingMcq ? 'MCQ updated ✅' : 'MCQ added ✅')
      openMcqs(mcqAffair)
      setEditingMcq(null)
      setMcqForm(emptyMcqForm(mcqForm.optionCount))
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
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMcqs(p => p.filter(m => m.id !== id))
      showToast('MCQ deleted')
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', 'error')
    }
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ title:item.title, detail:item.summary||item.full_content||'', category:item.category,
      type:item.type||(item.exam_tags?.find((t:string)=>['prelims','mains','both'].includes(t))||'prelims'), examTags:item.exam_tags||[], isImportant:item.is_important||false,
      publishDate:item.date?.split('T')[0]||'', status:item.status||'draft' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return }
    setSaving(true)
    try {
      const payload = { title:form.title, summary:form.detail, fullContent:form.detail,
        category:form.category, type:form.type, examTags:form.examTags,
        isImportant:form.isImportant, date:form.publishDate, status:form.status }
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
            { emoji:'📰', label:'Total',     value:total,                                       color:'text-slate-700',  bg:'bg-slate-50' },
            { emoji:'🎯', label:'Prelims',   value:list.filter(a=>{const t=a.type||(a.exam_tags?.find((x:string)=>['prelims','mains','both'].includes(x))||'prelims');return t==='prelims'||t==='both'}).length,   color:'text-green-700',  bg:'bg-green-50' },
            { emoji:'📝', label:'Mains',     value:list.filter(a=>{const t=a.type||(a.exam_tags?.find((x:string)=>['prelims','mains','both'].includes(x))||'prelims');return t==='mains'||t==='both'}).length,     color:'text-purple-700', bg:'bg-purple-50' },
            { emoji:'⭐', label:'Important', value:list.filter(a=>a.is_important).length,       color:'text-amber-700',  bg:'bg-amber-50' },
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
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Tag size={12} className="text-slate-400" />
            <select value={catFilter} onChange={e => { setCat(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
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
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.category}
                    </span>
                    {item.is_important && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⭐ Important
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-3">
                    {item.title}
                  </h3>

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

                  {/* Summary preview */}
                  {(item.summary || item.full_content) && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.summary || item.full_content}
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

      {/* ══════════════════ CREATE / EDIT MODAL ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit Current Affair' : 'Add Current Affair'}</h3>
                <p className="text-white/60 text-xs mt-0.5">{editing ? 'Update the article details' : 'Fill in all details for a new article'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Headline *</label>
                <textarea value={form.title} onChange={e => setForm({...form,title:e.target.value})}
                  className="input h-20 resize-none" placeholder="e.g. India signs trade agreement with…" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Detailed Explanation</label>
                <textarea value={form.detail} onChange={e => setForm({...form,detail:e.target.value})}
                  className="input h-28 resize-none" placeholder="Full analysis for Mains preparation…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
                  {/* Issue 4: styled select */}
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Type</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      <option value="prelims">Prelims</option>
                      <option value="mains">Mains</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Publish Date</label>
                  <input type="date" value={form.publishDate} onChange={e => setForm({...form,publishDate:e.target.value})} className="input w-full"/>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none"
                    onClick={() => setForm({...form,isImportant:!form.isImportant})}>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isImportant?'bg-amber-400':'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isImportant?'translate-x-5':'translate-x-0.5'}`}/>
                    </div>
                    <span className="text-sm font-medium text-slate-700">⭐ Mark Important</span>
                  </label>
                </div>
              </div>
              {/* Status toggle — draft / published */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-bold text-slate-600">Status</span>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-semibold">
                  {(['draft','published'] as const).map(s => (
                    <button key={s} onClick={() => setForm({...form, status: s})}
                      className={`px-4 py-2 transition-colors capitalize
                        ${form.status === s
                          ? s === 'published' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                      {s === 'published' ? '✅ Published' : '📝 Draft'}
                    </button>
                  ))}
                </div>
                {form.status === 'published' && (
                  <span className="text-[10px] text-green-600 font-medium">Visible to users in app</span>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title.trim()} className="btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Update' : 'Create'}
              </button>
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
                  <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full">{preview.category}</span>
                  <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full capitalize">{preview.type}</span>
                  {preview.is_important && <span className="px-2.5 py-1 bg-amber-400/30 text-white text-xs font-bold rounded-full">⭐ Important</span>}
                </div>
                <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0">
                  <X size={14} className="text-white"/>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{preview.title}</h2>

              {preview.date && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar size={12}/>
                  {new Date(preview.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </div>
              )}

              {(preview.summary || preview.full_content || preview.detail) && (
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Analysis</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{preview.summary || preview.full_content || preview.detail}</p>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMcqAffair(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white">MCQ Questions</h3>
                <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{mcqAffair.title}</p>
              </div>
              <button onClick={() => setMcqAffair(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Issue 7: No difficulty. Issue 8: Option count picker */}
              <div className="bg-purple-50 rounded-2xl p-4 space-y-4 border border-purple-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-purple-900">{editingMcq ? '✏️ Edit MCQ' : '➕ Add New MCQ'}</p>
                  {/* Issue 8: option count */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-purple-200">
                    <span className="text-[10px] text-slate-500 font-medium">Options:</span>
                    {[2,3,4,5].map(n => (
                      <button key={n} onClick={() => {
                        const cur = mcqForm.optionCount || 4
                        const opts = Array(n).fill('').map((_,i) => mcqForm.options[i] || '')
                        const correct = (mcqForm.correct||0) >= n ? 0 : (mcqForm.correct||0)
                        setMcqForm({...mcqForm, options:opts, optionCount:n, correct})
                      }}
                        className={`w-6 h-6 rounded-lg text-xs font-bold transition-colors
                          ${(mcqForm.optionCount||4)===n?'bg-purple-600 text-white':'text-slate-500 hover:bg-purple-100'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea value={mcqForm.question} onChange={e => setMcqForm({...mcqForm,question:e.target.value})}
                  placeholder="Question text *" className="input w-full resize-none h-16" autoFocus />

                {/* Dynamic options */}
                <div className="space-y-2">
                  {(mcqForm.options || []).map((opt: string, oi: number) => (
                    <div key={oi} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors
                      ${mcqForm.correct===oi?'border-green-400 bg-green-50':'border-transparent bg-white'}`}>
                      <button onClick={() => setMcqForm({...mcqForm,correct:oi})}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors
                          ${mcqForm.correct===oi?'bg-green-500 text-white':'bg-slate-100 border-2 border-slate-200 text-slate-500 hover:border-green-400'}`}>
                        {OPTION_LABELS[oi]}
                      </button>
                      <input value={opt} onChange={e => {
                        const opts = [...mcqForm.options]; opts[oi] = e.target.value
                        setMcqForm({...mcqForm,options:opts})
                      }}
                        className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                        placeholder={`Option ${OPTION_LABELS[oi]}…`}/>
                      {mcqForm.correct === oi && <span className="text-[10px] font-bold text-green-600 shrink-0">✓ Correct</span>}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Hint / Explanation <span className="font-normal text-slate-400">(shown after answering)</span>
                  </label>
                  <input value={mcqForm.explanation} onChange={e => setMcqForm({...mcqForm,explanation:e.target.value})}
                    className="input w-full" placeholder="Brief explanation of the correct answer…" />
                </div>

                <div className="flex gap-2">
                  <button onClick={saveMcq} disabled={mcqSaving||!mcqForm.question.trim()}
                    className="btn-primary text-sm disabled:opacity-40">
                    {mcqSaving ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : editingMcq ? 'Update MCQ' : 'Add MCQ'}
                  </button>
                  {editingMcq && (
                    <button onClick={() => { setEditingMcq(null); setMcqForm(emptyMcqForm(mcqForm.optionCount)) }} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Existing MCQs */}
              {mcqLoading ? (
                <div className="py-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></div>
              ) : mcqs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-2xl mb-2">❓</p>
                  <p className="text-sm">No MCQs yet — add the first one above</p>
                </div>
              ) : mcqs.map((mcq, i) => (
                <div key={mcq.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-slate-800">{i+1}. {mcq.question}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => {
                        setEditingMcq(mcq)
                        const opts = [mcq.option_a,mcq.option_b,mcq.option_c,mcq.option_d].filter(Boolean)
                        const correctIdx = ['a','b','c','d'].indexOf(mcq.correct||'a')
                        setMcqForm({question:mcq.question,options:opts,correct:correctIdx>=0?correctIdx:0,explanation:mcq.explanation||'',optionCount:opts.length})
                      }} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                        <Edit size={12} className="text-amber-600"/>
                      </button>
                      <button onClick={() => deleteMcq(mcq.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={12} className="text-red-600"/>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['a','b','c','d'].map(l => mcq[`option_${l}`] && (
                      <div key={l} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs
                        ${mcq.correct===l?'bg-green-100 text-green-800 font-semibold border border-green-200':'bg-white text-slate-600 border border-slate-200'}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
                          ${mcq.correct===l?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}`}>
                          {l.toUpperCase()}
                        </span>
                        {mcq[`option_${l}`]}
                      </div>
                    ))}
                  </div>
                  {mcq.explanation && <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-2.5 py-1.5 rounded-lg">💡 {mcq.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}