'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import DynamicSelect from '@/components/ui/DynamicSelect'
import {
  Plus, Search, RefreshCw, Edit, Trash2, X, ExternalLink,
  Briefcase, Calendar, MapPin, Users, IndianRupee, GraduationCap,
  ChevronLeft, ChevronRight, Building, UserCheck,
  FileText, Loader2, Upload, Bell, Globe,
} from 'lucide-react'

const EXPERIENCE_OPTIONS = ['Any', 'Freshers', '0-1 Years', '1-3 Years', '3-5 Years', '5+ Years']
const BIHAR_DISTRICTS = [
  'Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar',
  'Darbhanga','East Champaran','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur',
  'Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger',
  'Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur',
  'Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali','West Champaran',
]
const LIMIT = 15
const PUSH_CATEGORIES = ['Central Govt','Bihar Govt','BPSC','Railway','Banking','SSC','Defence','Private','Teaching']
const CAT_META: Record<string,{color:string;bg:string;border:string;emoji:string}> = {
  'BPSC':        { color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200',   emoji:'🎯' },
  'Bihar Govt':  { color:'text-indigo-700', bg:'bg-indigo-50', border:'border-indigo-200', emoji:'🏛️' },
  'Central Govt':{ color:'text-green-700',  bg:'bg-green-50',  border:'border-green-200',  emoji:'🇮🇳' },
  'Railway':     { color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200', emoji:'🚂' },
  'Banking':     { color:'text-purple-700', bg:'bg-purple-50', border:'border-purple-200', emoji:'🏦' },
  'SSC':         { color:'text-teal-700',   bg:'bg-teal-50',   border:'border-teal-200',   emoji:'📋' },
  'Defence':     { color:'text-red-700',    bg:'bg-red-50',    border:'border-red-200',    emoji:'🛡️' },
  'Private':     { color:'text-slate-700',  bg:'bg-slate-50',  border:'border-slate-200',  emoji:'🏢' },
  'Teaching':    { color:'text-emerald-700',bg:'bg-emerald-50',border:'border-emerald-200',emoji:'📚' },
}

function NumInput({ value, onChange, placeholder='' }: { value:number; onChange:(v:number)=>void; placeholder?:string }) {
  const [raw, setRaw] = useState(value===0?'':String(value))
  useEffect(() => { setRaw(value===0?'':String(value)) }, [value])
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={0}
      onChange={e => { setRaw(e.target.value); const n=parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()||isNaN(Number(raw))) { setRaw(''); onChange(0) } }}/>
  )
}

const EMPTY: any = {
  title:'', organization:'', category:'BPSC', totalVacancies:0,
  jobState:'Bihar', jobDistrict:'', jobCity:'', isRemote:false,
  salary:'', qualification:'', ageLimit:'', experienceRequired:'Any',
  lastDate:'', notificationDate:'', examDate:'',
  applicationUrl:'', isNew:true, isFeatured:false,
  description:'', briefDescription:'', pdfUrl:'', advertPdfUrl:'',
}

function SectionHeader({ n, color, title }: { n:number; color:string; title:string }) {
  const cls: Record<string,string> = {
    blue:'bg-blue-100 text-blue-700', green:'bg-green-100 text-green-700',
    purple:'bg-purple-100 text-purple-700', orange:'bg-orange-100 text-orange-700',
    red:'bg-red-100 text-red-700', amber:'bg-amber-100 text-amber-700',
  }
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${cls[color]||'bg-slate-100 text-slate-700'}`}>{n}</div>
      <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
    </div>
  )
}

export default function JobsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}><Inner /></Suspense>
}

function Inner() {
  const searchParams = useSearchParams()
  const { showToast, ToastComponent } = useToast()
  const [jobs, setJobs]       = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [govtTotal, setGovtTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [cat, setCat]         = useState('')
  const [sortBy, setSortBy]   = useState('created_desc')
  const [page, setPage]       = useState(1)
  const dSearch               = useDebounce(search, 400)
  const [showModal, setShowModal] = useState(searchParams.get('create') === '1')
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [advertPdfFile, setAdvertPdfFile]     = useState<File | null>(null)
  const [advertPdfUploading, setAdvertPdfUploading] = useState(false)
  const [advertPdfJobId, setAdvertPdfJobId]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.jobs.list({ search: dSearch, category: cat, sort: sortBy, page, limit: LIMIT })
      setJobs(res.data?.jobs || [])
      setTotal(res.data?.total || res.meta?.total || 0)
      if (res.data?.govtJobsTotal !== undefined) setGovtTotal(res.data.govtJobsTotal)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { setPage(1) }, [dSearch, cat, sortBy])
  useEffect(() => { load() }, [dSearch, cat, sortBy, page])

  const openNew = () => { setEditing(null); setForm(EMPTY); setAdvertPdfFile(null); setShowModal(true) }
  const openEdit = (j: any) => {
    setEditing(j); setAdvertPdfFile(null)
    setForm({
      title:j.title, organization:j.organization, category:j.category,
      totalVacancies:j.total_posts||j.total_vacancies||0,
      jobState:j.job_state||'Bihar', jobDistrict:j.job_district||'', jobCity:j.job_city||'',
      isRemote:j.is_remote||false, salary:j.salary_range||'',
      qualification:j.qualification||'', ageLimit:j.age_limit||'',
      experienceRequired:j.experience_required||'Any',
      lastDate:j.last_date?.split('T')[0]||'',
      notificationDate:j.notification_date?.split('T')[0]||'',
      examDate:j.exam_date?.split('T')[0]||'',
      applicationUrl:j.application_link||'',
      isNew:j.is_new!==undefined?j.is_new:true, isFeatured:j.is_featured||false,
      description:j.description||'', briefDescription:j.brief_description||'',
      pdfUrl:j.pdf_url||'', advertPdfUrl:j.advert_pdf_url||'',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.organization.trim()) { showToast('Title and organization are required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, totalVacancies:Number(form.totalVacancies)||0, totalPosts:Number(form.totalVacancies)||0 }
      let savedId = editing?.id
      if (editing) { await api.jobs.update(editing.id, payload); showToast('Job updated ✅') }
      else { const res = await api.jobs.create(payload); savedId = res.data?.job?.id; showToast('Job posted ✅') }
      if (advertPdfFile && savedId) {
        setAdvertPdfUploading(true)
        try { await api.jobs.uploadAdvertPdf(savedId, advertPdfFile); showToast('Advertisement PDF uploaded ✅') }
        catch (e: any) { showToast(`PDF upload failed: ${e.message}`, 'error') }
        finally { setAdvertPdfUploading(false) }
      }
      setShowModal(false); load()
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    setJobs(prev => prev.filter(j => j.id !== id))
    try { await api.jobs.delete(id); showToast('Job deleted'); load() }
    catch (e: any) { showToast(e.message, 'error'); load() }
  }

  const handleQuickPdfUpload = async (jobId: string, file: File) => {
    setAdvertPdfJobId(jobId)
    try { await api.jobs.uploadAdvertPdf(jobId, file); showToast('Advertisement PDF uploaded ✅'); load() }
    catch (e: any) { showToast(`PDF upload: ${e.message}`, 'error') }
    finally { setAdvertPdfJobId(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const daysUntil = (d: string) => { if (!d) return null; return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) }
  const locationPreview = (f: any) => {
    if (f.isRemote) return 'Remote'
    if (f.jobCity && f.jobDistrict) return `${f.jobCity}, ${f.jobDistrict}, ${f.jobState||'Bihar'}`
    if (f.jobDistrict) return `${f.jobDistrict}, ${f.jobState||'Bihar'}`
    return `${f.jobState||'Bihar'} (All Districts)`
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Job Vacancies" subtitle={`${total.toLocaleString()} listings`}/>
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'💼', label:'Total',      value:total,                                                                    color:'text-slate-700', bg:'bg-slate-50' },
            { emoji:'🏛️', label:'Govt Jobs',  value:govtTotal,                                                               color:'text-blue-700',  bg:'bg-blue-50' },
            { emoji:'⭐', label:'Featured',   value:jobs.filter(j=>j.is_featured).length,                                    color:'text-amber-700', bg:'bg-amber-50' },
            { emoji:'⏰', label:'Closing ≤7d',value:jobs.filter(j=>{ const d=daysUntil(j.last_date); return d!==null&&d>=0&&d<=7 }).length, color:'text-red-700', bg:'bg-red-50' },
          ].map(s=>(
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Notification note */}
        <div className="card p-3 flex items-start gap-2 bg-blue-50 border border-blue-200">
          <Bell size={14} className="text-blue-600 mt-0.5 shrink-0"/>
          <p className="text-xs text-blue-700"><b>Targeted Push:</b> Posting a job sends notifications <b>only</b> to users who subscribed to that category in the Job Alerts sheet. No spam.</p>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search…" className="input pl-9"/>
          </div>
          <div className="min-w-44"><DynamicSelect type="job-categories" value={cat} onChange={v=>{setCat(v);setPage(1)}} placeholder="All Categories"/></div>
          <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1)}} className="input text-sm min-w-44">
            <option value="created_desc">⭐ Featured → Newest</option>
            <option value="created_asc">Oldest First</option>
            <option value="last_date_asc">Closing Soon</option>
          </select>
          <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> Add Job</button>
        </div>

        {/* Job cards */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-slate-100 rounded w-2/3 mb-2"/><div className="h-3 bg-slate-100 rounded w-1/3"/></div>)}</div>
        ) : jobs.length===0 ? (
          <div className="card p-16 text-center"><Briefcase size={40} className="mx-auto mb-4 text-slate-200"/><p className="font-bold text-slate-700">No jobs found</p><button onClick={openNew} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Post a Job</button></div>
        ) : (
          <div className="space-y-3">
            {jobs.map(j=>{
              const meta=CAT_META[j.category]||CAT_META['Private']
              const days=daysUntil(j.last_date)
              const urgent=days!==null&&days>=0&&days<=7
              const expired=days!==null&&days<0
              return (
                <div key={j.id} className={`card p-5 hover:shadow-md transition-shadow group ${urgent?'border-l-4 border-l-red-400':j.is_featured?'border-l-4 border-l-amber-400':''}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl ${meta.bg} border ${meta.border}`}>{meta.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap mb-1.5">
                        <h3 className="font-bold text-slate-900 flex-1 leading-snug">{j.title}</h3>
                        <div className="flex gap-1 shrink-0 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>{j.category}</span>
                          {j.is_featured&&<span className="badge bg-amber-100 text-amber-700 border-amber-200 text-[10px]">⭐ Featured</span>}
                          {j.is_new&&<span className="badge bg-green-100 text-green-700 border-green-200 text-[10px]">🆕 New</span>}
                          {urgent&&<span className="badge bg-red-100 text-red-700 border-red-200 text-[10px]">⚠️ {days}d left</span>}
                          {expired&&<span className="badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Expired</span>}
                          {j.advert_pdf_url&&<span className="badge bg-red-50 text-red-600 border-red-200 text-[10px]">📄 Advert PDF</span>}
                          {(j.experience_required&&j.experience_required!=='Any')&&<span className="badge bg-slate-100 text-slate-600 border-slate-200 text-[10px]">🕐 {j.experience_required}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700"><Building size={11}/> {j.organization}</span>
                        {j.location&&<span className="flex items-center gap-1"><MapPin size={10}/> {j.location}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(j.total_posts||j.total_vacancies)>0&&<span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium"><Users size={10}/> {(j.total_posts||j.total_vacancies).toLocaleString()} posts</span>}
                        {(j.salary_range||j.salary)&&<span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium"><IndianRupee size={10}/> {j.salary_range||j.salary}</span>}
                        {j.qualification&&<span className="flex items-center gap-1 text-[11px] px-2 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium"><GraduationCap size={10}/> {j.qualification}</span>}
                        {j.last_date&&<span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium ${urgent?'bg-red-50 text-red-700':'bg-slate-50 text-slate-600'}`}><Calendar size={10}/> {new Date(j.last_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick PDF upload */}
                      <label className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center cursor-pointer" title="Upload Advertisement PDF">
                        {advertPdfJobId===j.id?<Loader2 size={13} className="text-red-600 animate-spin"/>:<FileText size={13} className="text-red-600"/>}
                        <input type="file" accept="application/pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleQuickPdfUpload(j.id,f);e.target.value='';}}/>
                      </label>
                      {j.application_link&&<a href={j.application_link} target="_blank" rel="noopener" className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center"><ExternalLink size={13} className="text-blue-600"/></a>}
                      <button onClick={()=>openEdit(j)} className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 flex items-center justify-center"><Edit size={13} className="text-amber-600"/></button>
                      <button onClick={()=>del(j.id,j.title)} className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 size={13} className="text-red-600"/></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total>LIMIT&&(
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">Showing <b>{Math.min((page-1)*LIMIT+1,total)}</b>–<b>{Math.min(page*LIMIT,total)}</b> of <b>{total}</b></p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>{const p=totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;return<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>})}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ CREATE/EDIT MODAL ══════════ */}
      {showModal&&(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing?'Edit Job':'Post Job Vacancy'}</h3>
                <p className="text-white/60 text-xs mt-0.5">
                  {PUSH_CATEGORIES.includes(form.category)?`🔔 Push → "${form.category}" subscribers only`:'No push for this category'}
                </p>
              </div>
              <button onClick={()=>setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X size={15} className="text-white"/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* 1 — Basic */}
              <section>
                <SectionHeader n={1} color="blue" title="Job Details"/>
                <div className="space-y-3">
                  <div><label className="field-label">Job Title *</label>
                    <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input w-full" placeholder="e.g. BPSC 72nd CCE" autoFocus/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="field-label">Organization *</label>
                      <input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} className="input w-full" placeholder="Bihar Public Service Commission"/></div>
                    <div><label className="field-label">Category</label>
                      <DynamicSelect type="job-categories" value={form.category} onChange={v=>setForm({...form,category:v})} placeholder="Select Category"/></div>
                  </div>
                  <div><label className="field-label">Description</label>
                    <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input h-20 resize-none w-full" placeholder="Full job details…"/></div>
                  <div><label className="field-label">Brief Summary <span className="text-slate-400 font-normal">(card teaser)</span></label>
                    <input value={form.briefDescription} onChange={e=>setForm({...form,briefDescription:e.target.value})} className="input w-full" placeholder="2-3 sentence summary"/></div>
                </div>
              </section>

              {/* 2 — Eligibility */}
              <section>
                <SectionHeader n={2} color="green" title="Vacancy & Eligibility"/>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Total Vacancies</label><NumInput value={form.totalVacancies} onChange={v=>setForm({...form,totalVacancies:v})} placeholder="e.g. 1200"/></div>
                  <div><label className="field-label">Age Limit</label><input value={form.ageLimit} onChange={e=>setForm({...form,ageLimit:e.target.value})} className="input w-full" placeholder="21–37 years"/></div>
                  <div><label className="field-label">Qualification</label><input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})} className="input w-full" placeholder="Graduation"/></div>
                  <div>
                    <label className="field-label">Experience Required</label>
                    <select value={form.experienceRequired} onChange={e=>setForm({...form,experienceRequired:e.target.value})} className="input w-full">
                      {EXPERIENCE_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="field-label">Salary Range</label>
                    <input value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} className="input w-full" placeholder="₹56,100–₹2,08,700/month"/></div>
                </div>
              </section>

              {/* 3 — Location hierarchy */}
              <section>
                <SectionHeader n={3} color="purple" title="Location"/>
                <label className="flex items-center gap-2 mb-3 cursor-pointer" onClick={()=>setForm({...form,isRemote:!form.isRemote})}>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isRemote?'bg-purple-500':'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRemote?'translate-x-5':'translate-x-0.5'}`}/>
                  </div>
                  <Globe size={13} className="text-slate-500"/>
                  <span className="text-sm font-semibold text-slate-700">Remote / Work from Home</span>
                </label>
                {!form.isRemote&&(
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="field-label">State</label>
                      <input value={form.jobState} onChange={e=>setForm({...form,jobState:e.target.value})} className="input w-full" placeholder="Bihar"/></div>
                    <div><label className="field-label">District</label>
                      <select value={form.jobDistrict} onChange={e=>setForm({...form,jobDistrict:e.target.value})} className="input w-full">
                        <option value="">All Districts</option>
                        {BIHAR_DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select></div>
                    <div><label className="field-label">City <span className="text-slate-400 font-normal">(opt)</span></label>
                      <input value={form.jobCity} onChange={e=>setForm({...form,jobCity:e.target.value})} className="input w-full" placeholder="e.g. Patna"/></div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">Preview: <b className="text-slate-600">{locationPreview(form)}</b></p>
              </section>

              {/* 4 — Timeline */}
              <section>
                <SectionHeader n={4} color="orange" title="Timeline & Links"/>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Notification Date</label><input type="date" value={form.notificationDate} onChange={e=>setForm({...form,notificationDate:e.target.value})} className="input w-full"/></div>
                  <div><label className="field-label">Last Date to Apply *</label><input type="date" value={form.lastDate} onChange={e=>setForm({...form,lastDate:e.target.value})} className="input w-full"/></div>
                  <div><label className="field-label">Exam Date</label><input type="date" value={form.examDate} onChange={e=>setForm({...form,examDate:e.target.value})} className="input w-full"/></div>
                  <div><label className="field-label">Application URL</label><input type="url" value={form.applicationUrl} onChange={e=>setForm({...form,applicationUrl:e.target.value})} className="input w-full" placeholder="https://bpsc.bih.nic.in"/></div>
                  <div className="col-span-2"><label className="field-label">Notification PDF URL <span className="text-slate-400 font-normal">(or upload below)</span></label>
                    <input type="url" value={form.pdfUrl} onChange={e=>setForm({...form,pdfUrl:e.target.value})} className="input w-full" placeholder="https://…/notification.pdf"/></div>
                </div>
              </section>

              {/* 5 — Advert PDF */}
              <section>
                <SectionHeader n={5} color="red" title="Advertisement PDF"/>
                <p className="text-xs text-slate-500 mb-3">Upload official job advertisement. Users can view & download from job detail page.</p>
                {(form.advertPdfUrl||editing?.advert_pdf_url)&&(
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl mb-3">
                    <FileText size={14} className="text-red-600 shrink-0"/>
                    <p className="text-xs text-red-700 flex-1 font-medium">PDF already uploaded ✅</p>
                    <a href={form.advertPdfUrl||editing?.advert_pdf_url} target="_blank" rel="noopener" className="text-xs text-red-600 underline">View</a>
                  </div>
                )}
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors">
                  <Upload size={18} className="text-red-500 shrink-0"/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{advertPdfFile?advertPdfFile.name:'Click to select PDF'}</p>
                    <p className="text-xs text-slate-400">Max 20 MB · PDF only</p>
                  </div>
                  {advertPdfFile&&<button onClick={e=>{e.preventDefault();setAdvertPdfFile(null)}} className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"><X size={12}/></button>}
                  <input type="file" accept="application/pdf" className="hidden" onChange={e=>setAdvertPdfFile(e.target.files?.[0]||null)}/>
                </label>
              </section>

              {/* 6 — Visibility */}
              <section>
                <SectionHeader n={6} color="amber" title="Visibility & Sort Priority"/>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {key:'isNew',icon:'🆕',label:'Mark as New',desc:'Badge + sorts 2nd'},
                    {key:'isFeatured',icon:'⭐',label:'Mark as Featured',desc:'Sorts 1st always'},
                  ].map(opt=>(
                    <label key={opt.key} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form[opt.key]?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}
                      onClick={()=>setForm({...form,[opt.key]:!form[opt.key]})}>
                      <div className={`w-9 h-5 rounded-full transition-colors relative ${form[opt.key]?'bg-brand-500':'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[opt.key]?'translate-x-4':'translate-x-0.5'}`}/>
                      </div>
                      <span className="text-lg">{opt.icon}</span>
                      <div><p className="text-xs font-bold text-slate-800">{opt.label}</p><p className="text-[10px] text-slate-400">{opt.desc}</p></div>
                    </label>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">1 Featured</span>→
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">2 New</span>→
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">3 Latest Created</span>
                </div>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||advertPdfUploading||!form.title.trim()||!form.organization.trim()} className="btn-primary disabled:opacity-40">
                {(saving||advertPdfUploading)?<><Loader2 size={14} className="animate-spin"/> {advertPdfUploading?'Uploading PDF…':'Saving…'}</>:editing?'Update Job':'Post Job →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
