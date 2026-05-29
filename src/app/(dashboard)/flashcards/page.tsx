'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import DynamicSelect from '@/components/ui/DynamicSelect'
import { useToast } from '@/components/ui/feedback'
import api from '@/lib/api'
import { useDebounce } from '@/lib/hooks'
import {
  Search, Plus, Edit, Trash2, RefreshCw, Brain,
  Eye, X, Image as ImageIcon, FileText, ChevronLeft,
  ChevronRight, Loader2, CheckCircle,
} from 'lucide-react'

type SideType = 'text' | 'image'
const EXAM_TAGS = ['BPSC 70th CCE','BPSC 71st CCE','Bihar Police SI','Bihar Constable','BPSC Teacher','UPSC CSE','SSC CGL']
const SUBJECT_EMOJI: Record<string,string> = { Polity:'⚖️', History:'🏛️', Geography:'🗺️', Economy:'💰', 'Bihar GK':'🏔️', Science:'🔬', Environment:'🌿', General:'📚' }
const LIMIT = 24

const emptyForm = {
  frontType: 'text' as SideType, backType: 'text' as SideType,
  front:'', back:'', subject:'Polity', topic:'', hint:'', example:'',
  examTags:['BPSC 70th CCE'] as string[], isActive:true,
  imageUrl:null as string|null, backImageUrl:null as string|null,
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData(); fd.append('image', file)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api/v1'}/admin/upload/image`,
    { method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('adminToken')}` }, body:fd }
  )
  const data = await res.json()
  const url  = data.data?.url || data.data?.imageUrl || data.url
  if (!url) throw new Error('No URL returned')
  return url
}

// Side type toggle
function SideToggle({ value, onChange }: { value: SideType; onChange: (v: SideType) => void }) {
  return (
    <div className="flex gap-1.5">
      {(['text','image'] as SideType[]).map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg border text-xs font-semibold transition-all
            ${value===t?'border-brand-500 bg-brand-50 text-brand-700':'border-slate-200 text-slate-400 hover:border-brand-200'}`}>
          {t==='text' ? <FileText size={11}/> : <ImageIcon size={11}/>}
          {t==='text' ? 'Text' : 'Image'}
        </button>
      ))}
    </div>
  )
}

// Image upload widget
function ImgUpload({ label, url, uploading, inputRef, onUpload, onRemove }: {
  label:string; url:string|null; uploading:boolean; inputRef:React.RefObject<HTMLInputElement>;
  onUpload:(f:File)=>void; onRemove:()=>void
}) {
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]) }} />
      {url ? (
        <div className="relative">
          <img src={url} alt={label} className="w-full max-h-40 object-contain rounded-xl border border-slate-200 bg-slate-50" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold shadow-sm hover:bg-slate-50">Change</button>
            <button type="button" onClick={onRemove} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"><X size={11}/></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50/30 transition-all disabled:opacity-60">
          {uploading
            ? <><Loader2 size={20} className="animate-spin text-brand-500"/><span className="text-xs text-slate-500">Uploading…</span></>
            : <><ImageIcon size={22} className="text-slate-300"/><span className="text-sm font-semibold text-slate-400">Upload {label} image</span><span className="text-xs text-slate-300">PNG · JPG · WEBP · max 5 MB</span></>}
        </button>
      )}
    </div>
  )
}

export default function FlashcardsPage() {
  const { showToast, ToastComponent } = useToast()
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterSubject, setFilter] = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(emptyForm)
  const [saving, setSaving]     = useState(false)
  const [preview, setPreview]   = useState<any>(null)
  const [frontUploading, setFrontUploading] = useState(false)
  const [backUploading, setBackUploading]   = useState(false)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search, 400)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.flashcards.list({ subject: filterSubject, search: debouncedSearch, page, limit: LIMIT })
      setList(res.data?.flashcards || [])
      setTotal(res.meta?.total ?? res.data?.total ?? res.data?.flashcards?.length ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { setPage(1) }, [debouncedSearch, filterSubject])
  useEffect(() => { load() }, [debouncedSearch, filterSubject, page])

  const openNew  = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      frontType: c.image_url ? 'image' : 'text', backType: c.back_image_url ? 'image' : 'text',
      front:c.front||c.question||'', back:c.back||c.answer||'',
      subject:c.subject||'Polity', topic:c.topic||'', hint:c.hint||'', example:c.example||'',
      examTags:c.exam_tags||[], isActive:c.is_active!==false,
      imageUrl:c.image_url||null, backImageUrl:c.back_image_url||null,
    })
    setShowModal(true)
  }

  const handleUpload = async (side: 'front'|'back', file: File) => {
    if (side==='front') { setFrontUploading(true); try { setForm((f:any)=>({...f,imageUrl:''})); const u=await uploadImage(file); setForm((f:any)=>({...f,imageUrl:u})) } catch(e:any){showToast('Upload failed: '+e.message,'error');setForm((f:any)=>({...f,imageUrl:null}))} finally{setFrontUploading(false)} }
    else { setBackUploading(true); try { const u=await uploadImage(file); setForm((f:any)=>({...f,backImageUrl:u})) } catch(e:any){showToast('Upload failed: '+e.message,'error')} finally{setBackUploading(false)} }
  }

  const save = async () => {
    if (form.frontType==='text' && !form.front.trim())  { showToast('Question text is required','error'); return }
    if (form.frontType==='image' && !form.imageUrl)     { showToast('Upload a front image','error'); return }
    if (form.backType==='text'  && !form.back.trim())   { showToast('Answer text is required','error'); return }
    if (form.backType==='image' && !form.backImageUrl)  { showToast('Upload a back image','error'); return }
    setSaving(true)
    try {
      const payload = { front:form.front?.trim()||'', back:form.back?.trim()||'', subject:form.subject,
        topic:form.topic.trim()||form.subject, hint:form.hint.trim(), example:form.example.trim(),
        examTags:form.examTags, isActive:form.isActive, cardType:form.frontType,
        imageUrl:form.frontType==='image'?form.imageUrl:null, backImageUrl:form.backType==='image'?form.backImageUrl:null }
      if (editing) await api.flashcards.update(editing.id, payload)
      else         await api.flashcards.create(payload)
      setShowModal(false); load(); showToast(editing ? 'Flashcard updated ✅' : 'Flashcard created ✅')
    } catch (e: any) { showToast(e.message||'Save failed','error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, label: string) => {
    if (!confirm(`Delete "${label.slice(0,60)}…"?`)) return
    try { await api.flashcards.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message,'error') }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Flashcards — Active Recall" subtitle="Create and manage front/back study cards" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'🃏', label:'Total',      value:total,                                                color:'text-slate-700', bg:'bg-slate-50' },
            { emoji:'📝', label:'Text only',  value:list.filter(c=>!c.image_url&&!c.back_image_url).length, color:'text-blue-700',  bg:'bg-blue-50' },
            { emoji:'🖼️', label:'Image front',value:list.filter(c=>c.image_url).length,                  color:'text-purple-700',bg:'bg-purple-50' },
            { emoji:'✅', label:'Active',     value:list.filter(c=>c.is_active!==false).length,           color:'text-green-700', bg:'bg-green-50' },
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

        {/* Issue 3: Removed bulk import — toolbar is cleaner now */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search flashcards…" className="input pl-9" />
          </div>
          <div className="w-44">
            <DynamicSelect type="subjects" value={filterSubject} onChange={v => { setFilter(v); setPage(1) }} placeholder="All Subjects" />
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2" title="Refresh"><RefreshCw size={13}/></button>
          {/* Issue 4: button text clean */}
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> New Flashcard</button>
        </div>

        {/* Issue 2: Card grid — better looking */}
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="card p-5 animate-pulse h-36"><div className="h-3 bg-slate-100 rounded w-2/3 mb-2"/><div className="h-2 bg-slate-100 rounded w-full mb-1"/><div className="h-2 bg-slate-100 rounded w-4/5"/></div>)}
          </div>
        ) : list.length === 0 ? (
          <div className="card p-16 text-center">
            <Brain size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No flashcards found</p>
            <button onClick={openNew} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Create First Flashcard</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(c => {
              const hasFront = !!c.image_url, hasBack = !!c.back_image_url
              const emoji = SUBJECT_EMOJI[c.subject] || '📚'
              return (
                <div key={c.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                  {/* Subject color bar */}
                  <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-400"/>
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{emoji} {c.subject}</span>
                        {c.topic && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.topic}</span>}
                        {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Hidden</span>}
                        {(hasFront||hasBack) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">{hasFront&&hasBack?'🖼️+🖼️':hasFront?'🖼️ Front':'🖼️ Back'}</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setPreview(c)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center"><Eye size={12} className="text-blue-500"/></button>
                        <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center"><Edit size={12} className="text-amber-600"/></button>
                        <button onClick={() => del(c.id, c.front||c.question||'')} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12} className="text-red-500"/></button>
                      </div>
                    </div>

                    {/* Front */}
                    <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                      <p className="text-[9px] text-blue-500 font-bold uppercase mb-1.5 tracking-wider">Front · Question</p>
                      {hasFront && <img src={c.image_url} alt="" className="w-full h-14 object-cover rounded-lg mb-1.5"/>}
                      {(c.front||c.question) && <p className="text-xs font-semibold text-slate-800 line-clamp-2">{c.front||c.question}</p>}
                    </div>

                    {/* Back */}
                    <div className="bg-green-50/60 rounded-xl p-3 border border-green-100">
                      <p className="text-[9px] text-green-600 font-bold uppercase mb-1.5 tracking-wider">Back · Answer</p>
                      {hasBack && <img src={c.back_image_url} alt="" className="w-full h-14 object-cover rounded-lg mb-1.5"/>}
                      {(c.back||c.answer) && <p className="text-xs text-slate-700 line-clamp-2">{c.back||c.answer}</p>}
                    </div>

                    {c.hint && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg">💡 {c.hint}</p>
                    )}
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
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold text-sm">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>{const p=totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;return<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>})}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
              <button disabled={page>=totalPages} onClick={()=>setPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 font-bold text-sm">»</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{SUBJECT_EMOJI[preview.subject]||'📚'} {preview.subject}</p>
                {preview.topic && <p className="text-white/60 text-xs">{preview.topic}</p>}
              </div>
              <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X size={13} className="text-white"/></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-[10px] text-blue-500 font-bold uppercase mb-2">Front · Question</p>
                {preview.image_url && <img src={preview.image_url} alt="" className="w-full rounded-xl mb-2"/>}
                {(preview.front||preview.question) && <p className="text-sm font-semibold text-slate-900">{preview.front||preview.question}</p>}
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-[10px] text-green-600 font-bold uppercase mb-2">Back · Answer</p>
                {preview.back_image_url && <img src={preview.back_image_url} alt="" className="w-full rounded-xl mb-2"/>}
                {(preview.back||preview.answer) && <p className="text-sm text-slate-700">{preview.back||preview.answer}</p>}
              </div>
              {preview.hint    && <div className="bg-amber-50 rounded-xl p-3"><p className="text-[10px] text-amber-600 font-bold mb-1">💡 HINT</p><p className="text-xs text-amber-800">{preview.hint}</p></div>}
              {preview.example && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold mb-1">📌 EXAMPLE</p><p className="text-xs text-slate-700">{preview.example}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Issue 5: Create / Edit Modal — clean new design */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden">

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-white text-lg">{editing ? 'Edit Flashcard' : 'New Flashcard'}</h2>
                <p className="text-white/60 text-xs mt-0.5">Front = question shown to student · Back = answer revealed on flip</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X size={15} className="text-white"/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Subject + Topic */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject *</label>
                  <DynamicSelect type="subjects" value={form.subject} onChange={v => setForm((f:any)=>({...f,subject:v}))} placeholder="Subject…" required/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Topic <span className="font-normal text-slate-400">(optional)</span></label>
                  <input value={form.topic} onChange={e => setForm((f:any)=>({...f,topic:e.target.value}))} className="input" placeholder="e.g. Fundamental Rights"/>
                </div>
              </div>

              {/* Front */}
              <div className="border-2 border-blue-200 rounded-2xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-100">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">🔵 Front — Question</span>
                  <SideToggle value={form.frontType} onChange={v => setForm((f:any)=>({...f,frontType:v,imageUrl:v==='text'?null:f.imageUrl}))}/>
                </div>
                <div className="p-4 space-y-3">
                  {form.frontType==='image' && <ImgUpload label="front" url={form.imageUrl} uploading={frontUploading} inputRef={frontRef} onUpload={f=>handleUpload('front',f)} onRemove={()=>setForm((f:any)=>({...f,imageUrl:null}))}/>}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{form.frontType==='image'?'Caption (optional)':'Question *'}</label>
                    <textarea value={form.front} onChange={e => setForm((f:any)=>({...f,front:e.target.value}))} rows={3} className="input w-full resize-none"
                      placeholder={form.frontType==='image'?'Optional caption for the image…':'e.g. Which article abolishes untouchability?'}/>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="border-2 border-green-200 rounded-2xl overflow-hidden">
                <div className="bg-green-50 px-4 py-3 flex items-center justify-between border-b border-green-100">
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide">🟢 Back — Answer</span>
                  <SideToggle value={form.backType} onChange={v => setForm((f:any)=>({...f,backType:v,backImageUrl:v==='text'?null:f.backImageUrl}))}/>
                </div>
                <div className="p-4 space-y-3">
                  {form.backType==='image' && <ImgUpload label="back" url={form.backImageUrl} uploading={backUploading} inputRef={backRef} onUpload={f=>handleUpload('back',f)} onRemove={()=>setForm((f:any)=>({...f,backImageUrl:null}))}/>}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{form.backType==='image'?'Caption (optional)':'Answer *'}</label>
                    <textarea value={form.back} onChange={e => setForm((f:any)=>({...f,back:e.target.value}))} rows={3} className="input w-full resize-none"
                      placeholder={form.backType==='image'?'Optional answer caption…':'Article 17 abolishes untouchability in any form.'}/>
                  </div>
                </div>
              </div>

              {/* Hint + Example */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">💡 Hint <span className="font-normal text-slate-400">(on front)</span></label>
                  <input value={form.hint} onChange={e => setForm((f:any)=>({...f,hint:e.target.value}))} className="input" placeholder="Think about Part III…"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">📌 Example <span className="font-normal text-slate-400">(on back)</span></label>
                  <input value={form.example} onChange={e => setForm((f:any)=>({...f,example:e.target.value}))} className="input" placeholder="Dr. Ambedkar invoked Art.17…"/>
                </div>
              </div>

              {/* Exam Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Relevant Exams</label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TAGS.map(tag => {
                    const sel = (form.examTags||[]).includes(tag)
                    return (
                      <button key={tag} type="button"
                        onClick={() => { const t=form.examTags||[]; setForm((f:any)=>({...f,examTags:sel?t.filter((x:string)=>x!==tag):[...t,tag]})) }}
                        className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-all
                          ${sel?'bg-brand-500 text-white border-brand-500':'bg-white text-slate-500 border-slate-200 hover:border-brand-300'}`}>
                        {sel && <CheckCircle size={10}/>} {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Visibility */}
              <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl cursor-pointer"
                onClick={() => setForm((f:any)=>({...f,isActive:!f.isActive}))}>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive?'bg-brand-500':'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive?'translate-x-5':'translate-x-0.5'}`}/>
                </div>
                <span className="text-sm font-medium text-slate-700">Visible to students</span>
              </label>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||frontUploading||backUploading} className="flex-1 btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Save Changes' : 'Create Flashcard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}