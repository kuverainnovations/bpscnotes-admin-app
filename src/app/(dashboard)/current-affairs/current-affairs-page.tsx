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
    setForm({ title: item.title, detail: item.detail||'', category: item.category,
      type: item.type||'prelims', examTags: item.exam_tags||[], isImportant: item.is_important||false,
      publishDate: item.publish_date?.split('T')[0]||'' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title) { showToast('Title is required', 'error'); return }
    setSaving(true)
    try {
      if (editing) await api.currentAffairs.update(editing.id, form)
      else         await api.currentAffairs.create(form)
      setShowModal(false); load()
      showToast(editing ? '✅ Updated' : '✅ Current affair created')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
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
                      {item.publish_date ? new Date(item.publish_date).toLocaleDateString('en-IN') : '—'}
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
  )
}
