'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, ExternalLink, Briefcase, RefreshCw } from 'lucide-react'

const empty = { title:'', organization:'', category:'BPSC', totalPosts:'', lastDate:'', examDate:'', ageLimit:'21-37 years', qualification:'Graduation', applicationLink:'', status:'active' }

export default function JobsPage() {
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(empty)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.jobs.list({ search })
      setList(res.data?.jobs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search])

  const openNew  = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ title:item.title, organization:item.organization, category:item.category, totalPosts:item.total_posts, lastDate:item.last_date?.split('T')[0], examDate:item.exam_date?.split('T')[0]||'', ageLimit:item.age_limit, qualification:item.qualification, applicationLink:item.application_link, status:item.status })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await api.jobs.update(editing.id, form)
      else await api.jobs.create(form)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this vacancy?')) return
    await api.jobs.delete(id); load()
  }

  return (
    <div className="min-h-screen">
      <Header title="Job Vacancies" subtitle="Manage government job alerts" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total', value: list.reduce((a,j)=>a+(j.total_posts||0),0), emoji:'💼' },
            { label:'Active', value: list.filter(j=>j.status==='active').length, emoji:'✅' },
            { label:'Upcoming', value: list.filter(j=>j.status==='upcoming').length, emoji:'🔜' },
            { label:'Expired', value: list.filter(j=>j.status==='expired').length, emoji:'⏰' },
          ].map(s=>(
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{formatNumber(s.value)}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vacancies..." className="input pl-9"/>
          </div>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Add Vacancy</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Job Title','Organization','Posts','Last Date','Views','Status','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(job=>(
                  <tr key={job.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><Briefcase size={16} className="text-orange-600"/></div>
                        <div>
                          <p className="font-semibold text-slate-800">{job.title}</p>
                          <p className="text-xs text-slate-400">{job.age_limit} · {job.qualification}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[140px] truncate">{job.organization}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatNumber(job.total_posts)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{job.last_date ? new Date(job.last_date).toLocaleDateString() : '—'}</p>
                      {job.exam_date && <p className="text-xs text-slate-400">Exam: {new Date(job.exam_date).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{formatNumber(job.view_count)}</p>
                      <p className="text-xs text-slate-400">💾 {formatNumber(job.save_count)}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${getStatusColor(job.status)}`}>{job.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {job.application_link && <a href={job.application_link} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"><ExternalLink size={13} className="text-green-600"/></a>}
                        <button onClick={()=>openEdit(job)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors"><Edit size={13} className="text-yellow-600"/></button>
                        <button onClick={()=>del(job.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={13} className="text-red-600"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div className="p-12 text-center text-slate-400">No job vacancies found</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Vacancy':'Add Vacancy'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Job Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="e.g. BPSC 70th CCE"/></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Organization *</label><input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} className="input" placeholder="Bihar Public Service Commission"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input">
                    {['BPSC','Bihar State','Central Govt','Railways','Teaching','Defence'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Total Posts</label><input type="number" value={form.totalPosts} onChange={e=>setForm({...form,totalPosts:e.target.value})} className="input"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Date *</label><input type="date" value={form.lastDate} onChange={e=>setForm({...form,lastDate:e.target.value})} className="input"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Exam Date</label><input type="date" value={form.examDate} onChange={e=>setForm({...form,examDate:e.target.value})} className="input"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Age Limit</label><input value={form.ageLimit} onChange={e=>setForm({...form,ageLimit:e.target.value})} className="input" placeholder="21-37 years"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Qualification</label><input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})} className="input" placeholder="Graduation"/></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Application Link</label><input type="url" value={form.applicationLink} onChange={e=>setForm({...form,applicationLink:e.target.value})} className="input" placeholder="https://..."/></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input">
                  <option value="active">Active</option><option value="upcoming">Upcoming</option><option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title||!form.organization||!form.lastDate} className="btn-primary disabled:opacity-50">{saving?'Saving...':editing?'Update':'Add Vacancy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
