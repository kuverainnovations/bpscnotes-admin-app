'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Plus, Search, RefreshCw, Edit, Trash2, Eye, X, Bookmark, ChevronDown } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

const EMPTY = {
  title: '', detail: '', category: 'General', type: 'prelims',
  examTags: ['BPSC 70th CCE'], isImportant: false, publishDate: '',
}
const CATEGORIES = ['General','Economy','Polity','Science & Tech','Environment','International','Bihar','Sports','Defence','Awards']
const TYPES      = ['prelims','mains','both']

export default function CurrentAffairsPage() {
  const openMcqs = async (item: any) => {
    setMcqAffair(item)
    setShowMcqModal(true)
    setMcqLoading(true)
    setMcqs([])
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/current-affairs/${item.id}/mcqs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      const data = await res.json()
      setMcqs(data.data?.mcqs || [])
    } catch { setMcqs([]) }
    setMcqLoading(false)
  }

  const saveMcq = async () => {
    if (!mcqForm.question || !mcqForm.optionA || !mcqForm.optionB || !mcqForm.optionC || !mcqForm.optionD) return
    setMcqSaving(true)
    try {
      const url = editingMcq
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/current-affairs/mcqs/${editingMcq.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/current-affairs/${mcqAffair.id}/mcqs`
      const method = editingMcq ? 'PUT' : 'POST'
      await fetch(url, { method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('adminToken')}` }, body: JSON.stringify(mcqForm) })
      await openMcqs(mcqAffair)
      setMcqForm({ question:'', optionA:'', optionB:'', optionC:'', optionD:'', correct:'a', explanation:'', difficulty:'medium' })
      setEditingMcq(null)
    } catch {}
    setMcqSaving(false)
  }

  const deleteMcq = async (mcqId: string) => {
    if (!confirm('Delete this MCQ?')) return
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/current-affairs/mcqs/${mcqId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })
    setMcqs(prev => prev.filter(m => m.id !== mcqId))
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CurrentAffairsPageContent />
    </Suspense>
  )
}

function CurrentAffairsPageContent() {
  const searchParams = useSearchParams()
  const { showToast, ToastComponent } = useToast()

  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCat]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]   = useState<any>(null)
  const [showMcqModal, setShowMcqModal] = useState(false)
  const [mcqAffair, setMcqAffair]       = useState<any>(null)
  const [mcqs, setMcqs]                 = useState<any[]>([])
  const [mcqLoading, setMcqLoading]     = useState(false)
  const [mcqForm, setMcqForm]           = useState({ question:'', optionA:'', optionB:'', optionC:'', optionD:'', correct:'a', explanation:'', difficulty:'medium' })
  const [editingMcq, setEditingMcq]     = useState<any>(null)
  const [mcqSaving, setMcqSaving]       = useState(false)
  const [form, setForm]         = useState<any>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [preview, setPreview]   = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.currentAffairs.list({ search, category: catFilter, type: typeFilter, page, limit: 20 })
      setList(res.data?.affairs || [])
      setTotal(res.data?.total || res.meta?.total || 0)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search, catFilter, typeFilter, page])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ title: item.title, detail: item.summary || item.full_content || '', category: item.category,
      type: item.type||'prelims', examTags: item.exam_tags||[], isImportant: item.is_important||false,
      publishDate: item.date?.split('T')[0]||'' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title) {
      showToast('Title is required', 'error')
      return
    }
  
    setSaving(true)
  
    try {
  
      const payload = {
        title: form.title,
        summary: form.detail,
        fullContent: form.detail,
        category: form.category,
        type: form.type,
        examTags: form.examTags,
        isImportant: form.isImportant,
        date: form.publishDate,
      }
  
      if (editing) {
        await api.currentAffairs.update(editing.id, payload)
      } else {
        await api.currentAffairs.create(payload)
      }
  
      setShowModal(false)
      load()
  
      showToast(editing ? '✅ Updated' : '✅ Current affair created')
  
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await api.currentAffairs.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const stats = [
    { emoji:'📰', label:'Total',    value: total },
    { emoji:'🎯', label:'Prelims',  value: list.filter(a=>a.type==='prelims').length },
    { emoji:'📝', label:'Mains',    value: list.filter(a=>a.type==='mains').length },
    { emoji:'⭐', label:'Important', value: list.filter(a=>a.is_important).length },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Current Affairs" subtitle="Manage daily current affairs for Prelims and Mains" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-2xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search headlines..." className="input pl-9" />
          </div>
          <select value={catFilter} onChange={e=>{setCat(e.target.value);setPage(1)}} className="input w-auto">
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={typeFilter} onChange={e=>{setType(e.target.value);setPage(1)}} className="input w-auto">
            <option value="">All Types</option>
            <option value="prelims">Prelims</option>
            <option value="mains">Mains</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Add Current Affair</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Headline','Category','Type','Date','Tags','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        {item.is_important && <span className="text-amber-500 mt-0.5 shrink-0">⭐</span>}
                        <p className="font-semibold text-slate-800 line-clamp-2 leading-snug">{item.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-blue-50 text-blue-700 border-blue-100">{item.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${item.type==='mains' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(item.exam_tags||[]).slice(0,2).map((t:string)=>(
                          <span key={t} className="badge bg-slate-50 text-slate-600 border-slate-200 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>setPreview(item)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Eye size={13} className="text-blue-600"/>
                        </button>
                        <button onClick={()=>openMcqs(item)} title="Manage MCQs" className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 flex items-center justify-center transition-colors">
                          <span className="text-purple-600 text-xs font-bold">Q</span>
                        </button>
                        <button onClick={()=>openEdit(item)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors">
                          <Edit size={13} className="text-amber-600"/>
                        </button>
                        <button onClick={()=>del(item.id,item.title)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={13} className="text-red-600"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div className="p-12 text-center text-slate-400">No current affairs found</div>}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary disabled:opacity-50">← Prev</button>
              <button disabled={page*20>=total} onClick={()=>setPage(p=>p+1)} className="btn-secondary disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>
                {editing ? 'Edit Current Affair' : 'Add Current Affair'}
              </h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Headline *</label>
                <textarea value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                  className="input h-20 resize-none" placeholder="Enter headline..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Detailed Explanation</label>
                <textarea value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})}
                  className="input h-32 resize-none" placeholder="Detailed analysis for Mains..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <DynamicSelect type="affair-categories" value={form.category} onChange={v=>setForm({...form,category:v})} placeholder="Select category…" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="input">
                    <option value="prelims">Prelims</option>
                    <option value="mains">Mains</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Publish Date</label>
                  <input type="date" value={form.publishDate} onChange={e=>setForm({...form,publishDate:e.target.value})} className="input"/>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input type="checkbox" id="imp" checked={form.isImportant} onChange={e=>setForm({...form,isImportant:e.target.checked})} className="w-4 h-4 accent-brand-500"/>
                  <label htmlFor="imp" className="text-sm text-slate-700 font-medium">⭐ Mark as Important</label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                <span className="badge bg-blue-50 text-blue-700 border-blue-100">{preview.category}</span>
                <span className={`badge ${preview.type==='mains' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{preview.type}</span>
                {preview.is_important && <span className="badge bg-amber-50 text-amber-700 border-amber-100">⭐ Important</span>}
              </div>
              <button onClick={()=>setPreview(null)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X size={14}/></button>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-3 leading-snug">{preview.title}</h2>
            {preview.detail && <p className="text-slate-600 text-sm leading-relaxed">{preview.detail}</p>}
          </div>
        </div>
      )}
    </div>

    {/* MCQ Management Modal */}
    {showMcqModal && mcqAffair && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={()=>setShowMcqModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">MCQ Questions</h2>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{mcqAffair.title}</p>
            </div>
            <button onClick={()=>setShowMcqModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16}/>
            </button>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
            {/* Add / Edit form */}
            <div className="bg-purple-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-purple-900 text-sm">{editingMcq ? '✏️ Edit MCQ' : '➕ Add New MCQ'}</h3>
              <textarea
                placeholder="Question text *"
                value={mcqForm.question}
                onChange={e=>setMcqForm(p=>({...p,question:e.target.value}))}
                className="w-full border border-purple-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                {(['A','B','C','D'] as const).map(l=>(
                  <input key={l}
                    placeholder={`Option ${l} *`}
                    value={mcqForm[`option${l}` as keyof typeof mcqForm]}
                    onChange={e=>setMcqForm(p=>({...p,[`option${l}`]:e.target.value}))}
                    className="border border-purple-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Correct Answer</label>
                  <select value={mcqForm.correct} onChange={e=>setMcqForm(p=>({...p,correct:e.target.value}))}
                    className="w-full border border-purple-200 rounded-lg p-2 text-sm focus:outline-none">
                    {['a','b','c','d'].map(v=><option key={v} value={v}>Option {v.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Difficulty</label>
                  <select value={mcqForm.difficulty} onChange={e=>setMcqForm(p=>({...p,difficulty:e.target.value}))}
                    className="w-full border border-purple-200 rounded-lg p-2 text-sm focus:outline-none">
                    {['easy','medium','hard'].map(v=><option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Explanation</label>
                  <input placeholder="(optional)" value={mcqForm.explanation}
                    onChange={e=>setMcqForm(p=>({...p,explanation:e.target.value}))}
                    className="w-full border border-purple-200 rounded-lg p-2 text-sm focus:outline-none"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveMcq} disabled={mcqSaving || !mcqForm.question}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {mcqSaving ? 'Saving…' : editingMcq ? 'Update MCQ' : 'Add MCQ'}
                </button>
                {editingMcq && (
                  <button onClick={()=>{setEditingMcq(null);setMcqForm({question:'',optionA:'',optionB:'',optionC:'',optionD:'',correct:'a',explanation:'',difficulty:'medium'})}}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                )}
              </div>
            </div>

            {/* Existing MCQs list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {mcqLoading ? (
                <div className="text-center py-8 text-gray-400">Loading MCQs…</div>
              ) : mcqs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-2xl mb-2">❓</p>
                  <p className="text-sm">No MCQs yet. Add your first question above.</p>
                </div>
              ) : mcqs.map((mcq,i)=>(
                <div key={mcq.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{i+1}. {mcq.question}</p>
                      <div className="grid grid-cols-2 gap-1 mt-1.5">
                        {['a','b','c','d'].map(l=>(
                          <p key={l} className={`text-xs px-2 py-1 rounded ${mcq.correct===l ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-600'}`}>
                            {l.toUpperCase()}) {mcq[`option_${l}`]}
                          </p>
                        ))}
                      </div>
                      {mcq.explanation && <p className="text-xs text-blue-600 mt-1">💡 {mcq.explanation}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={()=>{setEditingMcq(mcq);setMcqForm({question:mcq.question,optionA:mcq.option_a,optionB:mcq.option_b,optionC:mcq.option_c,optionD:mcq.option_d,correct:mcq.correct,explanation:mcq.explanation||'',difficulty:mcq.difficulty||'medium'})}}
                        className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                        <Edit size={12} className="text-amber-600"/>
                      </button>
                      <button onClick={()=>deleteMcq(mcq.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={12} className="text-red-600"/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
