'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import {
  Plus, Search, RefreshCw, Edit, Trash2, X, ExternalLink,
  Briefcase, Calendar, MapPin, Users, IndianRupee, GraduationCap,
  Filter, Clock, Loader2, ChevronLeft, ChevronRight, Building,
  UserCheck, Star,
} from 'lucide-react'

const CATS = ['BPSC','Bihar Govt','Central Govt','Railway','Banking','SSC','Defence','Private','Part-time']
const LIMIT = 15

const CAT_META: Record<string,{color:string;bg:string;border:string}> = {
  'BPSC':        { color:'text-blue-700',   bg:'bg-blue-100',   border:'border-blue-200' },
  'Bihar Govt':  { color:'text-indigo-700', bg:'bg-indigo-100', border:'border-indigo-200' },
  'Central Govt':{ color:'text-green-700',  bg:'bg-green-100',  border:'border-green-200' },
  'Railway':     { color:'text-orange-700', bg:'bg-orange-100', border:'border-orange-200' },
  'Banking':     { color:'text-purple-700', bg:'bg-purple-100', border:'border-purple-200' },
  'SSC':         { color:'text-teal-700',   bg:'bg-teal-100',   border:'border-teal-200' },
  'Defence':     { color:'text-red-700',    bg:'bg-red-100',    border:'border-red-200' },
  'Private':     { color:'text-slate-700',  bg:'bg-slate-100',  border:'border-slate-200' },
}

// Issue 6: NumInput — no default 0
function NumInput({ value, onChange, placeholder='', className='' }: { value:number; onChange:(v:number)=>void; placeholder?:string; className?:string }) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  useEffect(() => { setRaw(value===0?'':String(value)) }, [value])
  return (
    <input type="number" className={`input ${className}`} value={raw} placeholder={placeholder} min={0}
      onChange={e => { setRaw(e.target.value); const n=parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()||isNaN(Number(raw))) { setRaw(''); onChange(0) } }}/>
  )
}

const EMPTY = {
  title:'', organization:'', category:'BPSC', totalVacancies:0,
  location:'Bihar (All Districts)', salary:'', qualification:'',
  ageLimit:'', lastDate:'', applicationUrl:'', isNew:true, isFeatured:false,
  description:'', briefDescription:'', pdfUrl:'',
}

export default function JobsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}><Inner /></Suspense>
}

function Inner() {
  const searchParams = useSearchParams()
  const { showToast, ToastComponent } = useToast()

  const [jobs, setJobs]         = useState<any[]>([])
  const [total, setTotal]       = useState(0)
  const [govtTotal, setGovtTotal] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [cat, setCat]           = useState('')
  const [sortBy, setSortBy]       = useState('created_desc')
  const [page, setPage]         = useState(1)
  const debouncedSearch         = useDebounce(search, 400)

  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY)
  const [saving, setSaving]       = useState(false)

  // Issue 3: debounced search
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.jobs.list({ search: debouncedSearch, category: cat, sort: sortBy, page, limit: LIMIT })
      setJobs(res.data?.jobs || [])
      setTotal(res.data?.total || res.meta?.total || 0)
      if (res.data?.govtJobsTotal !== undefined) setGovtTotal(res.data.govtJobsTotal)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { setPage(1) }, [debouncedSearch, cat, sortBy])
  useEffect(() => { load() }, [debouncedSearch, cat, sortBy, page])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (j: any) => {
    setEditing(j)
    setForm({
      title:j.title, organization:j.organization||j.department||'', category:j.category,
      totalVacancies:j.total_posts||j.total_vacancies||0, location:j.location||'Bihar (All Districts)',
      salary:j.salary_range||j.salary||'', qualification:j.qualification||'',
      ageLimit:j.age_limit||'', lastDate:j.apply_end_date?.split('T')[0]||j.last_date?.split('T')[0]||'',
      applicationUrl:j.official_link||j.application_link||j.application_url||'',
      isNew:j.is_new||false, isFeatured:j.is_featured||false,
      description:j.description||'',
      briefDescription:j.brief_description||'',
      pdfUrl:j.pdf_url||'',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.organization.trim()) { showToast('Title and organization are required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, totalVacancies: Number(form.totalVacancies) || 0 }
      if (editing) await api.jobs.update(editing.id, payload)
      else         await api.jobs.create(payload)
      setShowModal(false); load(); showToast(editing ? 'Job updated ✅' : 'Job posted ✅')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    // Optimistic
    setJobs(prev => prev.filter(j => j.id !== id))
    try { await api.jobs.delete(id); showToast('Job deleted'); load() }
    catch (e: any) { showToast(e.message, 'error'); load() }
  }

  const totalPages = Math.ceil(total / LIMIT)

  const daysUntil = (dateStr: string) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    return diff
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Job Vacancies" subtitle={`${total.toLocaleString()} active listings`} />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'💼', label:'Total Listings', value:total,                                                       color:'text-slate-700', bg:'bg-slate-50' },
            { emoji:'🏛️', label:'Govt Jobs',      value:govtTotal, color:'text-blue-700', bg:'bg-blue-50' },
            { emoji:'🆕', label:'New',            value:jobs.filter(j=>j.is_new).length,                             color:'text-green-700', bg:'bg-green-50' },
            { emoji:'⏰', label:'Closing Soon',   value:jobs.filter(j=>{ const d=daysUntil(j.last_date); return d!==null&&d>=0&&d<=7 }).length, color:'text-red-700', bg:'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search title, organization…" className="input pl-9"/>
          </div>
          {/* Issue 4: styled select */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Filter size={12} className="text-slate-400"/>
            <select value={cat} onChange={e => { setCat(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="">All Categories</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="last_date_asc">Closing Soon</option>
              <option value="last_date_desc">Closing Last</option>
            </select>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> Add Job</button>
        </div>

        {/* Issue 2+5: Card list — rich, readable */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-slate-100 rounded w-2/3 mb-2"/><div className="h-3 bg-slate-100 rounded w-1/3"/></div>)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-16 text-center">
            <Briefcase size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No jobs found</p>
            <button onClick={openNew} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Post a Job</button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(j => {
              const meta    = CAT_META[j.category] || CAT_META['Private']
              const days    = daysUntil(j.last_date)
              const urgent  = days !== null && days >= 0 && days <= 7
              const expired = days !== null && days < 0

              return (
                <div key={j.id} className={`card p-5 hover:shadow-md transition-shadow group ${urgent ? 'border-l-4 border-l-red-400' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg} border ${meta.border}`}>
                      <Briefcase size={18} className={meta.color}/>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + badges */}
                      <div className="flex items-start gap-2 flex-wrap mb-1.5">
                        <h3 className="font-bold text-slate-900 flex-1 leading-snug">{j.title}</h3>
                        <div className="flex gap-1 shrink-0 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>{j.category}</span>
                          {j.is_new     && <span className="badge bg-green-100 text-green-700 border-green-200 text-[10px]">🆕 New</span>}
                          {j.is_featured && <span className="badge bg-amber-100 text-amber-700 border-amber-200 text-[10px]">⭐ Featured</span>}
                          {urgent       && <span className="badge bg-red-100 text-red-700 border-red-200 text-[10px]">⚠️ {days}d left</span>}
                          {expired      && <span className="badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Expired</span>}
                        </div>
                      </div>

                      {/* Org + location */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700"><Building size={11}/> {j.organization}</span>
                        {j.location && <span className="flex items-center gap-1"><MapPin size={10}/> {j.location}</span>}
                      </div>

                      {/* Detail pills */}
                      <div className="flex flex-wrap gap-2">
                        {j.total_vacancies > 0 && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                            <Users size={10}/> {j.total_vacancies.toLocaleString()} vacancies
                          </span>
                        )}
                        {(j.salary_range||j.salary) && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
                            <IndianRupee size={10}/> {j.salary_range||j.salary}
                          </span>
                        )}
                        {j.age_limit && (
                          <span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium">
                            <UserCheck size={10}/> Age: {j.age_limit}
                          </span>
                        )}
                        {j.last_date && (
                          <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium ${urgent?'bg-red-50 text-red-700':'bg-slate-50 text-slate-600'}`}>
                            <Calendar size={10}/> Last: {new Date(j.last_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {j.application_url && (
                        <a href={j.application_url} target="_blank" rel="noopener"
                          className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center" title="Open application URL">
                          <ExternalLink size={13} className="text-blue-600"/>
                        </a>
                      )}
                      <button onClick={() => openEdit(j)} className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                        <Edit size={13} className="text-amber-600"/>
                      </button>
                      <button onClick={() => del(j.id, j.title)} className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center">
                        <Trash2 size={13} className="text-red-600"/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">Showing <b>{Math.min((page-1)*LIMIT+1,total)}</b>–<b>{Math.min(page*LIMIT,total)}</b> of <b>{total}</b></p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>{const p=totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;return<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>})}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
              <button disabled={page>=totalPages} onClick={()=>setPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ ADD / EDIT JOB MODAL ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit Job' : 'Post Job Vacancy'}</h3>
                <p className="text-white/60 text-xs mt-0.5">{editing ? 'Update job listing details' : 'Visible to students in the Jobs section'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Section 1: Basic */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-black">1</div>
                  <h4 className="font-bold text-slate-800 text-sm">Job Details</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Job Title *</label>
                    <input value={form.title} onChange={e => setForm({...form,title:e.target.value})}
                      className="input w-full" placeholder="e.g. BPSC 72nd CCE — Combined Competitive Exam" autoFocus/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Organization *</label>
                      <input value={form.organization} onChange={e => setForm({...form,organization:e.target.value})}
                        className="input w-full" placeholder="Bihar Public Service Commission"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
                      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                          className="text-sm bg-transparent outline-none text-slate-700 w-full">
                          {CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})}
                      className="input h-20 resize-none w-full" placeholder="Brief job description…"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Brief Description <span className="text-slate-400 font-normal">(shown in app detail)</span></label>
                    <textarea value={form.briefDescription} onChange={e => setForm({...form,briefDescription:e.target.value})}
                      className="input h-16 resize-none w-full" placeholder="Short summary shown in app (1–2 lines)…"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">PDF URL <span className="text-slate-400 font-normal">(official notification PDF)</span></label>
                    <input value={form.pdfUrl} onChange={e => setForm({...form,pdfUrl:e.target.value})}
                      className="input w-full" placeholder="https://…/notification.pdf"/>
                  </div>
                </div>
              </section>

              {/* Section 2: Numbers */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-xs font-black">2</div>
                  <h4 className="font-bold text-slate-800 text-sm">Vacancy & Eligibility</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><Users size={11} className="inline mr-1"/>Total Vacancies</label>
                    {/* Issue 6: no default 0 */}
                    <NumInput value={form.totalVacancies} onChange={v => setForm({...form,totalVacancies:v})} placeholder="e.g. 1200"/>
                  </div>
                  {/* Issue 7: Age Limit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><UserCheck size={11} className="inline mr-1"/>Age Limit</label>
                    <input value={form.ageLimit} onChange={e => setForm({...form,ageLimit:e.target.value})}
                      className="input w-full" placeholder="e.g. 21–37 years (Gen)"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><GraduationCap size={11} className="inline mr-1"/>Qualification</label>
                    <input value={form.qualification} onChange={e => setForm({...form,qualification:e.target.value})}
                      className="input w-full" placeholder="Graduation in any discipline"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><IndianRupee size={11} className="inline mr-1"/>Salary Range</label>
                    <input value={form.salary} onChange={e => setForm({...form,salary:e.target.value})}
                      className="input w-full" placeholder="₹56,100–₹2,08,700/month"/>
                  </div>
                </div>
              </section>

              {/* Section 3: Location & Dates */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-black">3</div>
                  <h4 className="font-bold text-slate-800 text-sm">Location & Timeline</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><MapPin size={11} className="inline mr-1"/>Location</label>
                    <input value={form.location} onChange={e => setForm({...form,location:e.target.value})}
                      className="input w-full" placeholder="Bihar (All Districts)"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><Calendar size={11} className="inline mr-1"/>Last Date to Apply</label>
                    <input type="date" value={form.lastDate} onChange={e => setForm({...form,lastDate:e.target.value})} className="input w-full"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5"><ExternalLink size={11} className="inline mr-1"/>Application URL</label>
                    <input type="url" value={form.applicationUrl} onChange={e => setForm({...form,applicationUrl:e.target.value})}
                      className="input w-full" placeholder="https://bpsc.bih.nic.in/apply"/>
                  </div>
                </div>
              </section>

              {/* Section 4: Flags */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-black">4</div>
                  <h4 className="font-bold text-slate-800 text-sm">Visibility</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key:'isNew',      icon:'🆕', label:'Mark as New',      desc:'Shows "New" badge' },
                    { key:'isFeatured', icon:'⭐', label:'Mark as Featured',  desc:'Highlighted at top' },
                  ].map(opt => (
                    <label key={opt.key}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                        ${form[opt.key] ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
                      onClick={() => setForm({...form, [opt.key]: !form[opt.key]})}>
                      <div className={`w-9 h-5 rounded-full transition-colors relative ${form[opt.key]?'bg-brand-500':'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[opt.key]?'translate-x-4':'translate-x-0.5'}`}/>
                      </div>
                      <span className="text-lg">{opt.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title.trim()||!form.organization.trim()}
                className="btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Update Job' : 'Post Job →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}