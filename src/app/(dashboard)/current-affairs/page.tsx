'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, Eye, Star, RefreshCw } from 'lucide-react'

const categoryColors: Record<string,string> = {
  'Economy':'bg-green-50 text-green-700 border-green-100',
  'Bihar Affairs':'bg-yellow-50 text-yellow-700 border-yellow-100',
  'Science & Tech':'bg-blue-50 text-blue-700 border-blue-100',
  'Polity & Governance':'bg-purple-50 text-purple-700 border-purple-100',
  'International':'bg-orange-50 text-orange-700 border-orange-100',
  'Sports':'bg-red-50 text-red-700 border-red-100',
}

const empty = { title:'', summary:'', category:'Bihar Affairs', source:'', date: new Date().toISOString().split('T')[0], isImportant:false, examTags:['BPSC 70th CCE'], status:'published' }

export default function CurrentAffairsPage() {
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(empty)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.currentAffairs.list({ search, status, limit: 30 })
      setList(res.data?.affairs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search, status])

  const openNew  = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (item: any) => { setEditing(item); setForm({ title:item.title, summary:item.summary, category:item.category, source:item.source, date:item.date?.split('T')[0], isImportant:item.is_important, examTags:item.exam_tags, status:item.status }); setShowModal(true) }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await api.currentAffairs.update(editing.id, form)
      else await api.currentAffairs.create(form)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this article?')) return
    await api.currentAffairs.delete(id); load()
  }

  const stats = [
    { label:'Total', value:list.length, emoji:'📰' },
    { label:'Published', value:list.filter(c=>c.status==='published').length, emoji:'✅' },
    { label:'Important', value:list.filter(c=>c.is_important).length, emoji:'⭐' },
    { label:'Total Views', value:formatNumber(list.reduce((a,c)=>a+c.view_count,0)), emoji:'👁️' },
  ]

  return (
    <div className="min-h-screen">
      <Header title="Current Affairs" subtitle="Manage daily current affairs content" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search articles..." className="input pl-9"/>
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input w-auto">
            <option value="">All</option><option value="published">Published</option><option value="draft">Draft</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Add Article</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="space-y-3">
            {list.map(ca => (
              <div key={ca.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">📰</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {ca.is_important && <Star size={13} className="text-yellow-400 fill-yellow-400 shrink-0"/>}
                          <h3 className="font-bold text-slate-900 text-sm">{ca.title}</h3>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{ca.summary}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`badge text-[10px] ${categoryColors[ca.category]||'bg-slate-100 text-slate-600 border-slate-200'}`}>{ca.category}</span>
                          <span className="text-xs text-slate-400">{new Date(ca.date).toLocaleDateString()}</span>
                          <span className="text-xs text-slate-400">👁 {formatNumber(ca.view_count)}</span>
                          <span className="text-xs text-slate-400">🔖 {formatNumber(ca.bookmark_count)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`badge ${getStatusColor(ca.status)}`}>{ca.status}</span>
                        <button onClick={()=>openEdit(ca)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors"><Edit size={13} className="text-yellow-600"/></button>
                        <button onClick={()=>del(ca.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={13} className="text-red-600"/></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="card p-12 text-center text-slate-400">No current affairs found</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Article':'Add Article'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Headline *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="Article headline"/>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Summary *</label>
                <textarea value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} className="input h-20 resize-none" placeholder="Brief summary..."/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">
                    {['Bihar Affairs','Economy','Science & Tech','Polity & Governance','International','Sports'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="input"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Source</label>
                  <input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} className="input" placeholder="Ministry / Organization"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input">
                    <option value="published">Published</option><option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="imp" checked={form.isImportant} onChange={e=>setForm({...form,isImportant:e.target.checked})} className="rounded"/>
                <label htmlFor="imp" className="text-sm font-medium text-slate-700">Mark as Important ⭐</label>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title||!form.summary} className="btn-primary disabled:opacity-50">
                {saving?'Saving...': editing?'Update':'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
