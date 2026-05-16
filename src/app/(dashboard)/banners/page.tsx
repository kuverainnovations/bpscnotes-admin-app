'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, RefreshCw, Edit, Trash2, X, Image, ToggleLeft, ToggleRight } from 'lucide-react'


const EMPTY = {
  title:'', subtitle:'', imageUrl:'', ctaLabel:'',
  ctaRoute:'', bgColor:'#1565C0', isActive:true, sortOrder:0,
}
const ROUTES = ['/quizzes','/current-affairs','/study-materials','/wallet','/subscription','/rooms_hub','/jobs']

export default function BannersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BannersPageContent />
    </Suspense>
  )
}

function BannersPageContent() {
  const sp = useSearchParams()
  const { showToast, ToastComponent } = useToast()
  const [banners, setBanners]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(sp.get('create') === '1')
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(EMPTY)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.banners.list()
      setBanners(res.data?.banners || [])
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (b: any) => {
    setEditing(b)
    setForm({
      title:b.title, subtitle:b.subtitle||'', imageUrl:b.image_url||'',
      ctaLabel:b.cta_label||'', ctaRoute:b.cta_route||'',
      bgColor:b.bg_color||'#1565C0', isActive:b.is_active??true, sortOrder:b.sort_order||0,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title) { showToast('Title required', 'error'); return }
    setSaving(true)
    try {
      if (editing) await api.banners.update(editing.id, form)
      else         await api.banners.create(form)
      setShowModal(false); load()
      showToast(editing ? '✅ Updated' : '✅ Banner created')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await api.banners.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const toggle = async (b: any) => {
    try {
      await api.banners.update(b.id, { isActive: !b.is_active })
      load(); showToast(b.is_active ? 'Banner deactivated' : '✅ Banner activated')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Banners & Offers" subtitle="Manage promotional banners shown in the app"/>
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-4">
            <div className="card p-3 flex items-center gap-2 bg-green-50"><span className="text-lg">✅</span><div><p className="text-sm font-bold text-slate-800">{banners.filter(b=>b.is_active).length}</p><p className="text-xs text-slate-500">Active</p></div></div>
            <div className="card p-3 flex items-center gap-2 bg-slate-50"><span className="text-lg">⏸️</span><div><p className="text-sm font-bold text-slate-800">{banners.filter(b=>!b.is_active).length}</p><p className="text-xs text-slate-500">Inactive</p></div></div>
          </div>
          <div className="flex-1"/>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Create Banner</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map(b => (
              <div key={b.id} className={`card p-4 ${!b.is_active ? 'opacity-60' : ''}`}>
                {/* Preview */}
                <div className="h-20 rounded-xl mb-3 flex items-center px-4 relative overflow-hidden"
                  style={{background: b.bg_color||'#1565C0'}}>
                  {b.image_url && (
                    <img src={b.image_url} alt="" className="absolute right-0 top-0 h-full w-auto object-cover opacity-30"/>
                  )}
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-white leading-tight">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-white/80 mt-0.5">{b.subtitle}</p>}
                    {b.cta_label && (
                      <div className="mt-1.5 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg w-fit">
                        {b.cta_label} →
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Route: <span className="font-mono text-xs">{b.cta_route||'—'}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">Order: {b.sort_order||0}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggle(b)} title={b.is_active?'Deactivate':'Activate'}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${b.is_active ? 'bg-green-50 hover:bg-green-100' : 'bg-slate-100 hover:bg-slate-200'}`}>
                      {b.is_active ? <ToggleRight size={13} className="text-green-600"/> : <ToggleLeft size={13} className="text-slate-500"/>}
                    </button>
                    <button onClick={()=>openEdit(b)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                      <Edit size={13} className="text-amber-600"/>
                    </button>
                    <button onClick={()=>del(b.id,b.title)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                      <Trash2 size={13} className="text-red-600"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="md:col-span-2 card p-12 flex flex-col items-center gap-3 text-slate-400">
                <Image size={40} className="opacity-30"/>
                <p className="font-semibold">No banners yet</p>
                <button onClick={openNew} className="btn-primary"><Plus size={14}/>Create first banner</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Banner':'Create Banner'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Live preview */}
              <div className="h-16 rounded-xl px-4 flex items-center relative overflow-hidden"
                style={{background:form.bgColor}}>
                <div>
                  <p className="text-sm font-bold text-white">{form.title||'Banner Title'}</p>
                  {form.subtitle && <p className="text-xs text-white/80">{form.subtitle}</p>}
                </div>
                {form.ctaLabel && (
                  <div className="ml-auto bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">{form.ctaLabel} →</div>
                )}
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="e.g. 🎯 BPSC 70th CCE — Enroll Now!"/>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subtitle</label>
                <input value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} className="input" placeholder="Get 30% off on Pro plan"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Label</label>
                  <input value={form.ctaLabel} onChange={e=>setForm({...form,ctaLabel:e.target.value})} className="input" placeholder="Enroll Now"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">CTA Route</label>
                  <select value={form.ctaRoute} onChange={e=>setForm({...form,ctaRoute:e.target.value})} className="input">
                    <option value="">Select route...</option>
                    {ROUTES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Background Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.bgColor} onChange={e=>setForm({...form,bgColor:e.target.value})} className="w-10 h-9 rounded-lg cursor-pointer border-0"/>
                    <input value={form.bgColor} onChange={e=>setForm({...form,bgColor:e.target.value})} className="input flex-1" placeholder="#1565C0"/>
                  </div>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:+e.target.value})} className="input"/>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Image URL (optional)</label>
                <input value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} className="input" placeholder="https://..."/>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})} className="w-4 h-4 accent-brand-500"/>
                <label htmlFor="active" className="text-sm text-slate-700">Active (visible in app)</label>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

