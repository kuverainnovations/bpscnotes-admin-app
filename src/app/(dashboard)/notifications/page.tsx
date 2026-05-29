'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { useDebounce } from '@/lib/hooks'
import {
  Search, Plus, Send, Trash2, RefreshCw, X, Bell, BellRing,
  Users, Clock, CheckCircle, Loader2, Filter, Megaphone,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const NOTIF_TYPES = [
  { value:'announcement', label:'📢 Announcement',   desc:'General news & updates' },
  { value:'quiz',         label:'🎯 Quiz Alert',       desc:'Quiz reminders & results' },
  { value:'job',          label:'💼 Job Alert',        desc:'New job vacancies' },
  { value:'live',         label:'🔴 Live Class',       desc:'Upcoming live sessions' },
  { value:'course',       label:'📚 New Course',       desc:'Course launches' },
  { value:'streak',       label:'🔥 Streak Warning',   desc:'Streak protection nudge' },
  { value:'promotion',    label:'🎉 Offer',            desc:'Special promotions' },
]

const TARGET_OPTIONS = [
  { value:'all',          label:'👥 All Users' },
  { value:'premium',      label:'👑 Premium Only' },
  { value:'free',         label:'🆓 Free Users' },
  { value:'inactive',     label:'😴 Inactive (7+ days)' },
  { value:'exam',         label:'🎓 By Exam' },
]

const EMPTY_FORM = { title:'', body:'', type:'announcement', target:'all', targetExam:'', scheduledAt:'' }

const typeEmoji: Record<string,string> = { streak:'🔥', mock:'📝', job:'💼', promotion:'🎉', quiz:'🎯', announcement:'📢', live:'🔴', course:'📚', general:'🔔', system:'⚙️' }

export default function NotificationsPage() {
  const { showToast, ToastComponent } = useToast()
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]         = useState<any>(EMPTY_FORM)
  const [sending, setSending]   = useState(false)
  const debouncedSearch         = useDebounce(search, 400)

  const filtered = list.filter(n =>
    !debouncedSearch ||
    (n.title||'').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (n.body||'').toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.notifications.list()
      setList(res.data?.notifications || [])
    } catch (e: any) { showToast(e.message||'Failed to load', 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) { showToast('Title and message are required', 'error'); return }
    setSending(true)
    try {
      await api.notifications.send({
        title: form.title, body: form.body, type: form.type,
        target: form.target, targetExam: form.targetExam||undefined, scheduledAt: form.scheduledAt||undefined,
      })
      setShowModal(false); setForm(EMPTY_FORM); load()
      showToast('Notification sent ✅')
    } catch (e: any) { showToast(e.message||'Failed to send', 'error') }
    finally { setSending(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this notification record?')) return
    try { await api.notifications.delete(id); load(); showToast('Deleted') }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const stats = [
    { emoji:'📤', label:'Total Sent',   value:formatNumber(list.reduce((a,n)=>a+(n.total_sent||0),0)),   color:'text-slate-700', bg:'bg-slate-50' },
    { emoji:'👁️', label:'Total Opened', value:formatNumber(list.reduce((a,n)=>a+(n.total_opened||0),0)), color:'text-blue-700',  bg:'bg-blue-50' },
    { emoji:'⏰', label:'Scheduled',    value:list.filter(n=>n.status==='scheduled').length,              color:'text-amber-700', bg:'bg-amber-50' },
    { emoji:'🔔', label:'Total Records',value:list.length,                                               color:'text-green-700', bg:'bg-green-50' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Notifications" subtitle="Send push notifications and manage notification history" />

      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…" className="input pl-9"/>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={14}/> Send Notification</button>
        </div>

        {loading ? (
          <div className="card p-16 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-brand-400"/></div>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <Bell size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-700 text-lg mb-1">No notifications sent yet</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto"><Plus size={14}/> Send First Notification</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const openRate = n.total_sent > 0 ? Math.round((n.total_opened||0)/n.total_sent*100) : 0
              return (
                <div key={n.id} className="card p-5 hover:shadow-md transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">
                      {typeEmoji[n.type||'announcement']||'🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 leading-snug">{n.title}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`badge text-[10px] ${n.status==='sent'?'bg-green-100 text-green-700 border-green-200':n.status==='scheduled'?'bg-amber-100 text-amber-700 border-amber-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {n.status==='sent'?'✓ Sent':n.status==='scheduled'?'⏰ Scheduled':n.status}
                          </span>
                        </div>
                      </div>
                      {n.body && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{n.body}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Users size={10}/> {formatNumber(n.total_sent||0)} recipients</span>
                        {n.total_opened > 0 && <span className="flex items-center gap-1"><CheckCircle size={10} className="text-green-500"/> {openRate}% open rate</span>}
                        {n.sent_at && <span className="flex items-center gap-1"><Clock size={10}/> {new Date(n.sent_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
                        <span className="badge bg-slate-50 text-slate-500 border-slate-200 capitalize">{n.target||'all'}</span>
                      </div>
                    </div>
                    <button onClick={() => del(n.id)} className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Trash2 size={13} className="text-red-500"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[94vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <BellRing size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Send Notification</h3>
                  <p className="text-white/60 text-xs">Delivered via push to selected users</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Type picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Notification Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTIF_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm({...form, type:t.value})}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all
                        ${form.type===t.value?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-base shrink-0">{t.label.split(' ')[0]}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{t.label.slice(2)}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Title * <span className="font-normal text-slate-400">(keep under 50 chars)</span></label>
                <input value={form.title} onChange={e => setForm({...form,title:e.target.value})}
                  className="input w-full" placeholder="e.g. 📢 New BPSC vacancy announced!" maxLength={80} autoFocus/>
                <p className="text-[10px] text-slate-400 mt-1 text-right">{form.title.length}/80</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Message *</label>
                <textarea value={form.body} onChange={e => setForm({...form,body:e.target.value})}
                  className="input resize-none h-20 w-full" placeholder="Detailed message seen in notification…" maxLength={200}/>
                <p className="text-[10px] text-slate-400 mt-1 text-right">{form.body.length}/200</p>
              </div>

              {/* Target */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Send To</label>
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <Users size={13} className="text-slate-400"/>
                  <select value={form.target} onChange={e => setForm({...form,target:e.target.value})}
                    className="text-sm bg-transparent outline-none text-slate-700 w-full">
                    {TARGET_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Target exam */}
              {form.target === 'exam' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Target Exam</label>
                  <input value={form.targetExam} onChange={e => setForm({...form,targetExam:e.target.value})}
                    className="input w-full" placeholder="e.g. BPSC 70th CCE"/>
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Schedule For <span className="font-normal text-slate-400">(leave empty = send now)</span>
                </label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({...form,scheduledAt:e.target.value})} className="input w-full"/>
              </div>

              {/* Preview */}
              {(form.title || form.body) && (
                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">📱 Device Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-sm shrink-0">
                      {typeEmoji[form.type]||'🔔'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{form.title || 'Title goes here'}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{form.body || 'Message preview…'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={send} disabled={sending||!form.title.trim()||!form.body.trim()}
                className="btn-primary disabled:opacity-40 flex items-center gap-2">
                {sending ? <><Loader2 size={14} className="animate-spin"/> Sending…</> : <><Send size={14}/> {form.scheduledAt?'Schedule':'Send Now'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

