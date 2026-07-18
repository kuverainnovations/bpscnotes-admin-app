'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import DynamicSelect from '@/components/ui/DynamicSelect'
import {
  Plus, RefreshCw, Edit, Trash2, X, Radio,
  Users, Clock, Calendar, Link2, BookOpen,
  Coins, Loader2, PlayCircle, StopCircle,
} from 'lucide-react'

const EMPTY = {
  title:'', instructor:'', subject:'', description:'',
  scheduledAt:'', durationMins:60, meetUrl:'', isLive:false,
  maxAttendees:500, coinsReward:5,
}
const SUBJECTS = ['Polity','History','Geography','Economy','Science','Environment','Bihar GK','English','Math','Current Affairs']

// UTC instant (from the API) → "YYYY-MM-DDTHH:mm" in the browser's local
// timezone, the format datetime-local inputs expect.
function toLocalInputValue(utcIso: string): string {
  const d = new Date(utcIso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function LiveClassesPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading…</div>}><Inner /></Suspense>
}

function Inner() {
  const sp = useSearchParams()
  const { showToast, ToastComponent } = useToast()
  const [list, setList]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(sp.get('create') === '1')
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm]       = useState<any>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [toggling, setToggling] = useState<string|null>(null)

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
      // Stored value is a UTC instant — convert to the browser's local
      // time for the datetime-local input (the old .replace('Z','') put
      // the UTC digits in the field as if they were local, shifting the
      // time +5:30 on every edit round-trip).
      scheduledAt: lc.scheduled_at ? toLocalInputValue(lc.scheduled_at) : '',
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title || !form.instructor) { showToast('Title and instructor required', 'error'); return }
    setSaving(true)
    try {
      // datetime-local gives a timezone-less string ("2026-07-17T16:01")
      // in the admin's local time (IST). Sending it raw made the backend
      // store those digits as UTC, so the app displayed them +5:30 later
      // (QA 18-07 issue 3: 4:01 PM became 9:31 PM). Convert to a real
      // UTC instant before sending.
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : form.scheduledAt,
      }
      if (editing) await api.liveClasses.update(editing.id, payload)
      else         await api.liveClasses.create(payload)
      setShowModal(false); load()
      showToast(editing ? 'Class updated ✅' : 'Live class scheduled ✅')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await api.liveClasses.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const toggleLive = async (lc: any) => {
    setToggling(lc.id)
    try {
      await api.liveClasses.toggle(lc.id, !lc.is_live)
      load(); showToast(lc.is_live ? '⏹ Class ended' : '🔴 Class is now LIVE!')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setToggling(null) }
  }

  const live     = list.filter(l => l.is_live)
  const upcoming = list.filter(l => !l.is_live && new Date(l.scheduled_at) > new Date())
  const past     = list.filter(l => !l.is_live && new Date(l.scheduled_at) <= new Date())

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Live Classes" subtitle="Schedule and manage live teaching sessions" />

      <div className="p-4 md:p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji:'🔴', label:'Live Now',       value:live.length,      color:'text-red-700',    bg:'bg-red-50' },
            { emoji:'📅', label:'Upcoming',       value:upcoming.length,  color:'text-blue-700',   bg:'bg-blue-50' },
            { emoji:'✅', label:'Completed',      value:past.length,      color:'text-green-700',  bg:'bg-green-50' },
            { emoji:'👥', label:'Total Registered',value:list.reduce((a,l)=>a+(l.registered_count||0),0), color:'text-purple-700', bg:'bg-purple-50' },
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

        {/* Toolbar */}
        <div className="flex justify-end gap-3">
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/> Schedule Class</button>
        </div>

        {loading ? (
          <div className="card p-16 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-brand-400"/>
          </div>
        ) : list.length === 0 ? (
          <div className="card p-16 text-center">
            <Radio size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No live classes yet</p>
            <button onClick={openNew} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Schedule First Class</button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Live now section */}
            {live.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"/>
                  Live Now
                </p>
                {live.map(lc => <ClassCard key={lc.id} lc={lc} onEdit={openEdit} onDel={del} onToggle={toggleLive} toggling={toggling} fmt={fmt}/>)}
              </div>
            )}
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">📅 Upcoming</p>
                {upcoming.map(lc => <ClassCard key={lc.id} lc={lc} onEdit={openEdit} onDel={del} onToggle={toggleLive} toggling={toggling} fmt={fmt}/>)}
              </div>
            )}
            {/* Past */}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">✅ Completed</p>
                {past.map(lc => <ClassCard key={lc.id} lc={lc} onEdit={openEdit} onDel={del} onToggle={toggleLive} toggling={toggling} fmt={fmt}/>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 sm:rounded-t-3xl rounded-t-3xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                  {editing ? '✏️' : '📡'}
                </div>
                <div>
                  <h3 className="font-bold text-white">{editing ? 'Edit Live Class' : 'Schedule Live Class'}</h3>
                  <p className="text-white/60 text-xs">Students get notified when class goes live</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Class Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                  className="input w-full" placeholder="e.g. Polity — Fundamental Rights Deep Dive" autoFocus/>
              </div>

              {/* Instructor + Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Instructor *</label>
                  <input value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})}
                    className="input w-full" placeholder="Prof. Sharma"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject</label>
                  <DynamicSelect type="subjects" value={form.subject} onChange={v=>setForm({...form,subject:v})} placeholder="Select…" />
                </div>
              </div>

              {/* Schedule + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    <Calendar size={11} className="inline mr-1"/>Scheduled At
                  </label>
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e=>setForm({...form,scheduledAt:e.target.value})} className="input w-full"
                    step="60" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    <Clock size={11} className="inline mr-1"/>Duration (min)
                  </label>
                  <input type="number" value={form.durationMins}
                    onChange={e=>setForm({...form,durationMins:+e.target.value})} className="input w-full" min={15}/>
                </div>
              </div>

              {/* Meet URL */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  <Link2 size={11} className="inline mr-1"/>Meet / Stream URL
                </label>
                <input type="url" value={form.meetUrl} onChange={e=>setForm({...form,meetUrl:e.target.value})}
                  className="input w-full" placeholder="https://meet.google.com/abc-defg"/>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                  className="input w-full resize-none h-16" placeholder="What will students learn?"/>
              </div>

              {/* Max attendees + Coins */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    <Users size={11} className="inline mr-1"/>Max Attendees
                  </label>
                  <input type="number" value={form.maxAttendees}
                    onChange={e=>setForm({...form,maxAttendees:+e.target.value})} className="input w-full"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins Reward</label>
                  <input type="number" value={form.coinsReward}
                    onChange={e=>setForm({...form,coinsReward:+e.target.value})} className="input w-full"/>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.instructor.trim()} className="flex-1 btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Save Changes' : 'Schedule Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassCard({ lc, onEdit, onDel, onToggle, toggling, fmt }: any) {
  const isToggling = toggling === lc.id
  return (
    <div className={`card p-4 hover:shadow-md transition-shadow ${lc.is_live ? 'border-2 border-red-300 bg-red-50/20' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${lc.is_live ? 'bg-red-100' : 'bg-blue-50'}`}>
          {lc.is_live ? '🔴' : '📹'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-slate-900 text-sm truncate">{lc.title}</p>
            {lc.is_live && <span className="badge bg-red-500 text-white border-0 text-[10px] animate-pulse">● LIVE</span>}
            {lc.subject && <span className="badge bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{lc.subject}</span>}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {lc.instructor && <span>👤 {lc.instructor}</span>}
            <span className="flex items-center gap-1"><Users size={10}/> {lc.registered_count||0}</span>
            <span className="flex items-center gap-1"><Clock size={10}/> {lc.duration_mins||60} min</span>
            {lc.scheduled_at && <span>{fmt(lc.scheduled_at)}</span>}
            {lc.coins_reward > 0 && <span>🪙 {lc.coins_reward}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onToggle(lc)} disabled={isToggling}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60
              ${lc.is_live ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
            {isToggling
              ? <Loader2 size={12} className="animate-spin"/>
              : lc.is_live ? <><StopCircle size={12}/> End</> : <><PlayCircle size={12}/> Go Live</>}
          </button>
          <button onClick={() => onEdit(lc)} className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center">
            <Edit size={12} className="text-amber-600"/>
          </button>
          <button onClick={() => onDel(lc.id, lc.title)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
            <Trash2 size={12} className="text-red-600"/>
          </button>
        </div>
      </div>
    </div>
  )
}