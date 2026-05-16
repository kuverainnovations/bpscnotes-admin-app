'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Plus, RefreshCw, Edit, Trash2, X, Radio, Users, Clock } from 'lucide-react'

const EMPTY = {
  title:'', instructor:'', subject:'', description:'',
  scheduledAt:'', durationMins:60, meetUrl:'', isLive:false,
  maxAttendees:500, coinsReward:5,
}
const SUBJECTS = ['Polity','History','Geography','Economy','Science','Environment','Bihar GK','English','Math']

export default function LiveClassesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LiveClassesPageContent />
    </Suspense>
  )
}

function LiveClassesPageContent() {
  const sp = useSearchParams()
  const { showToast, ToastComponent } = useToast()

  const [list, setList]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(sp.get('create') === '1')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm]       = useState<any>(EMPTY)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.liveClasses.list()
      setList(res.data?.liveClasses || [])
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (lc: any) => {
    setEditing(lc)
    setForm({
      title: lc.title, instructor: lc.instructor||'', subject: lc.subject||'',
      description: lc.description||'', durationMins: lc.duration_mins||60,
      meetUrl: lc.meet_url||'', isLive: lc.is_live||false,
      maxAttendees: lc.max_attendees||500, coinsReward: lc.coins_reward||5,
      scheduledAt: lc.scheduled_at ? lc.scheduled_at.replace('Z','').slice(0,16) : '',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title || !form.instructor) { showToast('Title and instructor required', 'error'); return }
    setSaving(true)
    try {
      if (editing) await api.liveClasses.update(editing.id, form)
      else         await api.liveClasses.create(form)
      setShowModal(false); load()
      showToast(editing ? '✅ Updated' : '✅ Live class created')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await api.liveClasses.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const toggleLive = async (lc: any) => {
    try {
      await api.liveClasses.toggle(lc.id, !lc.is_live)
      load(); showToast(lc.is_live ? '⏹ Class ended' : '🔴 Class is now LIVE')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const live    = list.filter(l => l.is_live)
  const upcoming= list.filter(l => !l.is_live && new Date(l.scheduled_at) > new Date())
  const past    = list.filter(l => !l.is_live && new Date(l.scheduled_at) <= new Date())

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Live Classes" subtitle="Schedule and manage live teaching sessions"/>
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji:'🔴', label:'Live Now',  value:live.length,     color:'bg-red-50' },
            { emoji:'📅', label:'Upcoming',  value:upcoming.length, color:'bg-blue-50' },
            { emoji:'📚', label:'Completed', value:past.length,     color:'bg-green-50' },
            { emoji:'👥', label:'Total Registered', value:list.reduce((a,l)=>a+(l.registered_count||0),0), color:'bg-purple-50' },
          ].map(s=>(
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.color}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div/>
          <div className="flex gap-3">
            <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
            <button onClick={openNew} className="btn-primary"><Plus size={14}/>Schedule Class</button>
          </div>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="space-y-3">
            {list.length === 0 && <div className="card p-12 text-center text-slate-400">No live classes scheduled</div>}
            {list.map(lc => (
              <div key={lc.id} className={`card p-4 ${lc.is_live ? 'border-2 border-red-400 bg-red-50/30' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${lc.is_live ? 'bg-red-100' : 'bg-blue-50'}`}>
                    {lc.is_live ? '🔴' : '📹'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-slate-900 text-sm">{lc.title}</p>
                      {lc.is_live && <span className="badge bg-red-500 text-white border-0 animate-pulse text-[10px]">● LIVE</span>}
                      {lc.subject && <span className="badge bg-blue-50 text-blue-700 border-blue-100">{lc.subject}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Users size={11}/>{lc.registered_count||0} registered</span>
                      <span className="flex items-center gap-1"><Clock size={11}/>{lc.duration_mins||60} min</span>
                      {lc.scheduled_at && (
                        <span>{new Date(lc.scheduled_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</span>
                      )}
                    </div>
                    {lc.instructor && <p className="text-xs text-slate-400 mt-1">👤 {lc.instructor}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={()=>toggleLive(lc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${lc.is_live ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {lc.is_live ? '⏹ End' : '▶ Go Live'}
                    </button>
                    <button onClick={()=>openEdit(lc)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
                      <Edit size={13} className="text-amber-600"/>
                    </button>
                    <button onClick={()=>del(lc.id,lc.title)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                      <Trash2 size={13} className="text-red-600"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Class':'Schedule Live Class'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Class Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="e.g. Polity — Fundamental Rights"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Instructor *</label>
                  <input value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})} className="input" placeholder="Prof. Sharma"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                  <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="input">
                    <option value="">Select...</option>
                    {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Scheduled At</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})} className="input"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration (min)</label>
                  <input type="number" value={form.durationMins} onChange={e=>setForm({...form,durationMins:+e.target.value})} className="input"/>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Meet / Stream URL</label>
                <input type="url" value={form.meetUrl} onChange={e=>setForm({...form,meetUrl:e.target.value})} className="input" placeholder="https://meet.google.com/..."/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Attendees</label>
                  <input type="number" value={form.maxAttendees} onChange={e=>setForm({...form,maxAttendees:+e.target.value})} className="input"/>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Coins Reward</label>
                  <input type="number" value={form.coinsReward} onChange={e=>setForm({...form,coinsReward:+e.target.value})} className="input"/>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
