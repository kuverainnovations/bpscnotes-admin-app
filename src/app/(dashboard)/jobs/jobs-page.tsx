'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, Search, RefreshCw, Edit, Trash2, Eye, X, ExternalLink } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

const EMPTY = {
  title:'', organization:'', category:'BPSC', totalVacancies:0,
  location:'Bihar (All Districts)', salary:'', qualification:'',
  ageLimit:'', lastDate:'', applicationUrl:'', isNew:true,
  description:'',
}
const CATS = ['BPSC','Bihar Govt','Central Govt','Railway','Banking','SSC','Defence','Private','Part-time']

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  )
}

function JobsPageContent() {
  const searchParams = useSearchParams()
  const { showToast, ToastComponent } = useToast()

  const [jobs, setJobs]         = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [cat, setCat]           = useState('')
  const [page, setPage]         = useState(1)
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.jobs.list({ search, category: cat, page, limit: 20 })
      setJobs(res.data?.jobs || [])
      setTotal(res.data?.total || res.meta?.total || 0)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search, cat, page])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (j: any) => {
    setEditing(j)
    setForm({
      title: j.title, organization: j.organization, category: j.category,
      totalVacancies: j.total_vacancies||0, location: j.location||'',
      salary: j.salary_range||'', qualification: j.qualification||'',
      ageLimit: j.age_limit||'', lastDate: j.last_date?.split('T')[0]||'',
      applicationUrl: j.application_url||'', isNew: j.is_new||false,
      description: j.description||'',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title || !form.organization) { showToast('Title and organization required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, totalVacancies: +form.totalVacancies }
      if (editing) await api.jobs.update(editing.id, payload)
      else         await api.jobs.create(payload)
      setShowModal(false); load()
      showToast(editing ? '✅ Job updated' : '✅ Job created')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await api.jobs.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const catColor: Record<string,string> = {
    BPSC:'bg-blue-50 text-blue-700', 'Bihar Govt':'bg-indigo-50 text-indigo-700',
    'Central Govt':'bg-green-50 text-green-700', Railway:'bg-orange-50 text-orange-700',
    Banking:'bg-purple-50 text-purple-700', Private:'bg-slate-50 text-slate-700',
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Job Vacancies" subtitle={`${total} active job listings`} />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'💼', label:'Total',       value:total },
            { emoji:'🏛️', label:'Govt Jobs',   value:jobs.filter(j=>j.category!=='Private'&&j.category!=='Part-time').length },
            { emoji:'🏢', label:'Private',     value:jobs.filter(j=>j.category==='Private').length },
            { emoji:'🆕', label:'New This Week',value:jobs.filter(j=>j.is_new).length },
          ].map(s=>(
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-2xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search job title, org..." className="input pl-9"/>
          </div>
          <select value={cat} onChange={e=>{setCat(e.target.value);setPage(1)}} className="input w-auto">
            <option value="">All Categories</option>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Add Job</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Job Title','Category','Vacancies','Last Date','Status','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="table-row">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{j.title}</p>
                      <p className="text-xs text-slate-400">{j.organization}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${catColor[j.category]||'bg-slate-50 text-slate-700'} border-0`}>{j.category}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{j.total_vacancies?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {j.last_date ? new Date(j.last_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {j.is_new && <span className="badge bg-green-50 text-green-700 border-green-100">New</span>}
                        {j.is_featured && <span className="badge bg-amber-50 text-amber-700 border-amber-100">Featured</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {j.application_url && (
                          <a href={j.application_url} target="_blank" rel="noopener"
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center">
                            <ExternalLink size={13} className="text-blue-600"/>
                          </a>
                        )}
                        <button onClick={()=>openEdit(j)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                          <Edit size={13} className="text-amber-600"/>
                        </button>
                        <button onClick={()=>del(j.id,j.title)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                          <Trash2 size={13} className="text-red-600"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobs.length === 0 && <div className="p-12 text-center text-slate-400">No jobs found</div>}
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} · {total} total</p>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary disabled:opacity-50">← Prev</button>
              <button disabled={page*20>=total} onClick={()=>setPage(p=>p+1)} className="btn-secondary disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Job':'Add Job Vacancy'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Job Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="e.g. BPSC 70th CCE Recruitment"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Organization *</label>
                  <input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} className="input" placeholder="Bihar Public Service Commission"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <DynamicSelect type="job-categories" value={form.category} onChange={v=>setForm({...form,category:v})} placeholder="Select category…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Total Vacancies</label>
                  <input type="number" value={form.totalVacancies} onChange={e=>setForm({...form,totalVacancies:e.target.value})} className="input"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Date</label>
                  <input type="date" value={form.lastDate} onChange={e=>setForm({...form,lastDate:e.target.value})} className="input"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Salary Range</label>
                  <input value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} className="input" placeholder="₹56,100 – ₹2,08,700/month"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                  <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="input"/>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Qualification</label>
                <input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})} className="input" placeholder="Graduation in any discipline"/>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Application URL</label>
                <input type="url" value={form.applicationUrl} onChange={e=>setForm({...form,applicationUrl:e.target.value})} className="input" placeholder="https://bpsc.bih.nic.in"/>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input h-20 resize-none" placeholder="Job details..."/>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isnew" checked={form.isNew} onChange={e=>setForm({...form,isNew:e.target.checked})} className="w-4 h-4 accent-brand-500"/>
                <label htmlFor="isnew" className="text-sm text-slate-700">🆕 Mark as New</label>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
