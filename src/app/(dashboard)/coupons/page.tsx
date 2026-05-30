'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, Tag, Copy, RefreshCw, X, Loader2, Percent, IndianRupee, Calendar, Users, Zap } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const EMPTY_FORM = { code:'', type:'percent', value:0, description:'', appliesTo:'both', maxUses:'', expiresAt:'' }

// No default 0
function NumInput({ value, onChange, placeholder='' }: { value:any; onChange:(v:any)=>void; placeholder?:string }) {
  const [raw, setRaw] = useState(value===0||value===''?'':String(value))
  return (
    <input type="number" className="input w-full" value={raw} placeholder={placeholder} min={0}
      onChange={e => { setRaw(e.target.value); const n=parseFloat(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim()) { setRaw(''); onChange(0) } }}/>
  )
}

function generateCode() {
  const words = ['BPSC','BIHAR','STUDY','LEARN','PASS','EXAM']
  const w = words[Math.floor(Math.random()*words.length)]
  const n = Math.floor(10+Math.random()*90)
  return `${w}${n}`
}

export default function CouponsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const [couponFilter, setCouponFilter] = useState<string>('')
  const { data, loading, error, refetch } = useApiData<any>(() => api.subscriptions.getCoupons(), [])
  const allCoupons: any[] = data?.coupons || []
  const coupons = couponFilter === 'active' ? allCoupons.filter(c => c.is_active && !(c.expires_at && daysLeft(c.expires_at) < 0))
    : couponFilter === 'expiring' ? allCoupons.filter(c => c.expires_at && daysLeft(c.expires_at) >= 0 && daysLeft(c.expires_at) <= 7)
    : allCoupons

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.subscriptions.updateCoupon(editing.id, d) : api.subscriptions.createCoupon(d),
    { onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Coupon updated ✅' : 'Coupon created ✅') },
      onError: (msg) => showToast(msg, 'error') }
  )
  const { mutate: remove } = useMutation((id: string) => api.subscriptions.deleteCoupon(id),
    { onSuccess: () => { refetch(); showToast('Deleted') }, onError: (m) => showToast(m, 'error') })
  const toggleCoupon = async (id: string, isActive: boolean) => {
    try { await api.subscriptions.updateCoupon(id, { isActive }); refetch() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const openNew  = () => { setEditing(null); setForm({...EMPTY_FORM, code:generateCode()}); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ code:c.code, type:c.type, value:c.value, description:c.description||'', appliesTo:c.applies_to||'both', maxUses:c.max_uses||'', expiresAt:c.expires_at?c.expires_at.split('T')[0]:'' })
    setShowModal(true)
  }
  const copy = (code: string) => { navigator.clipboard?.writeText(code); showToast(`Copied: ${code}`) }

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime()-Date.now())/86400000)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Coupon Codes" subtitle="Manage discount coupons for subscriptions and courses" />

      <div className="p-6 space-y-5 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'🏷️', label:'Total',        value:allCoupons.length,                                        color:'text-slate-700', bg:'bg-slate-50',   filter:'' },
            { emoji:'✅', label:'Active',        value:allCoupons.filter(c=>c.is_active&&!(c.expires_at&&daysLeft(c.expires_at)<0)).length, color:'text-green-700', bg:'bg-green-50', filter:'active' },
            { emoji:'📊', label:'Total Redeemed',value:formatNumber(allCoupons.reduce((a,c)=>a+(c.used_count||0),0)), color:'text-blue-700', bg:'bg-blue-50', filter:'' },
            { emoji:'⏰', label:'Expiring Soon', value:allCoupons.filter(c=>c.expires_at&&daysLeft(c.expires_at)<=7&&daysLeft(c.expires_at)>=0).length, color:'text-amber-700', bg:'bg-amber-50', filter:'expiring' },
          ].map(s => (
            <div key={s.label} onClick={() => setCouponFilter(f => f === s.filter ? '' : s.filter)}
              className={`card p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md
                ${s.bg} ${couponFilter === s.filter && s.filter ? 'ring-2 ring-blue-400' : ''}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}
                  {s.filter && couponFilter === s.filter && <span className="ml-1 text-blue-500">× clear</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> Create Coupon</button>
        </div>

        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch}/> : (
          <div className="space-y-3">
            {coupons.length === 0 ? (
              <div className="card p-16 text-center">
                <Tag size={40} className="mx-auto mb-4 text-slate-200"/>
                <p className="font-bold text-slate-700 text-lg mb-1">No coupons yet</p>
                <button onClick={openNew} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Create First Coupon</button>
              </div>
            ) : coupons.map(coupon => {
              const usePct = coupon.max_uses ? Math.min(100, Math.round((coupon.used_count||0)/coupon.max_uses*100)) : 0
              const dl = coupon.expires_at ? daysLeft(coupon.expires_at) : null
              const isExpired = dl !== null && dl < 0
              return (
                <div key={coupon.id} className={`card p-5 hover:shadow-md transition-shadow ${!coupon.is_active||isExpired?'opacity-60':''}`}>
                  <div className="flex items-start gap-4">
                    {/* Discount badge */}
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black
                      ${coupon.type==='percent'?'bg-purple-50 border border-purple-100':'bg-green-50 border border-green-100'}`}>
                      <span className={`text-lg leading-none ${coupon.type==='percent'?'text-purple-700':'text-green-700'}`}>{coupon.value}</span>
                      <span className={`text-[10px] font-bold ${coupon.type==='percent'?'text-purple-500':'text-green-500'}`}>{coupon.type==='percent'?'%':'₹ off'}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="font-mono font-black text-slate-900 text-base tracking-wider">{coupon.code}</code>
                        <button onClick={() => copy(coupon.code)} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                          <Copy size={11} className="text-slate-500"/>
                        </button>
                        <span className={`badge ${coupon.is_active&&!isExpired?'bg-green-100 text-green-700 border-green-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {isExpired?'Expired':coupon.is_active?'Active':'Inactive'}
                        </span>
                        <span className="badge bg-slate-50 text-slate-600 border-slate-200 text-[10px] capitalize">{coupon.applies_to}</span>
                        {dl!==null&&dl>=0&&dl<=7&&<span className="badge bg-red-50 text-red-600 border-red-200 text-[10px]">⚠️ {dl}d left</span>}
                      </div>
                      {coupon.description && <p className="text-xs text-slate-500 mb-2">{coupon.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        {coupon.max_uses && <span className="flex items-center gap-1"><Users size={10}/> {coupon.used_count||0}/{coupon.max_uses} used</span>}
                        {coupon.expires_at && <span className="flex items-center gap-1"><Calendar size={10}/> Expires {new Date(coupon.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                      </div>
                      {coupon.max_uses && (
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden w-48">
                          <div className="h-full rounded-full" style={{width:`${usePct}%`,background:usePct>80?'#ef4444':usePct>50?'#f59e0b':'#10b981'}}/>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => toggleCoupon(coupon.id, !coupon.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                          ${coupon.is_active?'bg-red-50 hover:bg-red-100 text-red-600':'bg-green-50 hover:bg-green-100 text-green-600'}`}>
                        {coupon.is_active?'Disable':'Enable'}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(coupon)} className="flex-1 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors"><Edit size={13} className="text-amber-600"/></button>
                        <button onClick={() => { if(confirm('Delete this coupon?')) remove(coupon.id) }} className="flex-1 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={13} className="text-red-600"/></button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit Coupon' : 'Create Coupon Code'}</h3>
                <p className="text-white/60 text-xs mt-0.5">{editing ? 'Update coupon details' : 'New discount code for students'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X size={15} className="text-white"/></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Coupon Code *</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm({...form,code:e.target.value.toUpperCase()})}
                    className="input flex-1 font-mono text-base uppercase tracking-widest font-bold" placeholder="BIHAR25" disabled={!!editing}/>
                  {!editing && (
                    <button onClick={() => setForm({...form,code:generateCode()})}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors shrink-0">
                      <Zap size={13}/> Auto
                    </button>
                  )}
                </div>
                {editing && <p className="text-[10px] text-slate-400 mt-1">Code cannot be changed after creation</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm({...form,description:e.target.value})}
                  className="input w-full" placeholder="e.g. Independence Day special discount"/>
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Discount Type</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    {[{v:'percent',icon:<Percent size={13}/>,label:'Percent'},{v:'flat',icon:<IndianRupee size={13}/>,label:'Flat ₹'}].map(t=>(
                      <button key={t.v} onClick={() => setForm({...form,type:t.v})}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors
                          ${form.type===t.v?'bg-brand-500 text-white':'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Value * {form.type==='percent'?'(%)':'(₹)'}</label>
                  <NumInput value={form.value} onChange={v => setForm({...form,value:v})} placeholder={form.type==='percent'?'e.g. 20':'e.g. 100'}/>
                </div>
              </div>

              {/* Applies to */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Applies To</label>
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <select value={form.appliesTo} onChange={e => setForm({...form,appliesTo:e.target.value})}
                    className="text-sm bg-transparent outline-none text-slate-700 w-full">
                    <option value="both">Both — Subscriptions & Courses</option>
                    <option value="subscription">Subscriptions only</option>
                    <option value="course">Courses only</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Max Uses</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({...form,maxUses:e.target.value})}
                    className="input w-full" placeholder="Unlimited"/>
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty = unlimited</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm({...form,expiresAt:e.target.value})} className="input w-full"/>
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty = no expiry</p>
                </div>
              </div>

              {/* Preview */}
              {form.code && form.value > 0 && (
                <div className="p-3.5 bg-brand-50 rounded-2xl border border-brand-100">
                  <p className="text-xs font-bold text-brand-700 mb-1">Preview</p>
                  <p className="text-sm text-brand-800">
                    Code <code className="font-mono font-black">{form.code}</code> gives{' '}
                    <strong>{form.type==='percent'?`${form.value}% off`:`₹${form.value} off`}</strong>{' '}
                    on {form.appliesTo==='both'?'subscriptions & courses':form.appliesTo}
                    {form.maxUses ? `, max ${form.maxUses} uses` : ''}
                    {form.expiresAt ? `, expires ${new Date(form.expiresAt).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save({...form, maxUses:form.maxUses?Number(form.maxUses):null, expiresAt:form.expiresAt||null})}
                disabled={saving||!form.code.trim()||!form.value} className="btn-primary disabled:opacity-40">
                {saving?<><Loader2 size={14} className="animate-spin"/> Saving…</>:editing?'Update Coupon':'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}