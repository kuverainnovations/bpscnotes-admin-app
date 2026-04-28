'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Send, Trash2, RefreshCw } from 'lucide-react'

export default function NotificationsPage() {
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [target, setTarget]     = useState('all')
  const [notifType, setNotifType] = useState('announcement')
  const [targetExam, setTargetExam] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sending, setSending]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.notifications.list()
      setList(res.data?.notifications || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const send = async () => {
    if (!title || !body) return
    setSending(true)
    try {
      await api.notifications.send({ title, body, type: notifType, target, targetExam: targetExam||undefined, scheduledAt: scheduledAt||undefined })
      setShowModal(false); setTitle(''); setBody(''); setTarget('all'); load()
    } catch (e: any) { alert(e.message) }
    finally { setSending(false) }
  }

  const typeEmoji: Record<string,string> = { streak:'🔥', mock:'📝', job:'💼', promotion:'🎉', quiz:'🎯', announcement:'📢', live:'🔴', course:'📚' }

  return (
    <div className="min-h-screen">
      <Header title="Notifications" subtitle="Send push notifications to users"/>
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total Sent',   value: formatNumber(list.reduce((a,n)=>a+(n.total_sent||0),0)), emoji:'📤' },
            { label:'Total Opened', value: formatNumber(list.reduce((a,n)=>a+(n.total_opened||0),0)), emoji:'👁️' },
            { label:'Scheduled',    value: list.filter(n=>n.status==='scheduled').length, emoji:'⏰' },
            { label:'Total Notifs', value: list.length, emoji:'🔔' },
          ].map(s=>(
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-700 flex-1">Sent Notifications</h2>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={()=>setShowModal(true)} className="btn-primary"><Plus size={14}/>Compose</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="space-y-3">
            {list.map(notif => {
              const openRate = notif.total_sent > 0 ? Math.round(notif.total_opened/notif.total_sent*100) : 0
              return (
                <div key={notif.id} className="card p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">{typeEmoji[notif.type]||'🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-slate-900 text-sm">{notif.title}</p>
                            <span className={`badge ${getStatusColor(notif.status)}`}>{notif.status}</span>
                            <span className="badge bg-blue-50 text-blue-600 border-blue-100 text-[10px]">👥 {notif.target}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{notif.body}</p>
                        </div>
                      </div>
                      {notif.total_sent > 0 && (
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100">
                          <div><p className="text-sm font-bold text-slate-700">{formatNumber(notif.total_sent)}</p><p className="text-xs text-slate-400">Sent</p></div>
                          <div><p className="text-sm font-bold text-blue-600">{formatNumber(notif.total_opened)} ({openRate}%)</p><p className="text-xs text-slate-400">Opened</p></div>
                          <div><p className="text-sm font-bold text-green-600">{formatNumber(notif.total_clicked||0)}</p><p className="text-xs text-slate-400">Clicked</p></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {list.length === 0 && <div className="card p-12 text-center text-slate-400">No notifications sent yet</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>Compose Notification</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} className="input" placeholder="Notification title" maxLength={60}/>
                <p className="text-xs text-slate-400 mt-1">{title.length}/60</p>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Message *</label>
                <textarea value={body} onChange={e=>setBody(e.target.value)} className="input h-20 resize-none" placeholder="Notification body..." maxLength={200}/>
                <p className="text-xs text-slate-400 mt-1">{body.length}/200</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={notifType} onChange={e=>setNotifType(e.target.value)} className="input">
                    <option value="announcement">📢 Announcement</option>
                    <option value="quiz">🎯 Quiz</option>
                    <option value="job">💼 Job Alert</option>
                    <option value="promotion">🎉 Promotion</option>
                    <option value="live">🔴 Live Class</option>
                    <option value="streak">🔥 Streak</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Audience</label>
                  <select value={target} onChange={e=>setTarget(e.target.value)} className="input">
                    <option value="all">👥 All Users</option>
                    <option value="free">🆓 Free Users</option>
                    <option value="pro">👑 Pro Users</option>
                    <option value="exam">🎯 By Exam</option>
                  </select>
                </div>
              </div>
              {target === 'exam' && (
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Exam</label>
                  <select value={targetExam} onChange={e=>setTargetExam(e.target.value)} className="input">
                    <option value="">Select exam...</option>
                    {['BPSC 70th CCE','BPSC 71st CCE','Bihar Police SI','SSC CGL','Railway NTPC','UPSC CSE'].map(e=><option key={e}>{e}</option>)}
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Schedule (optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="input"/>
              </div>
              {title && (
                <div className="rounded-xl bg-slate-900 p-4">
                  <p className="text-xs text-slate-400 mb-2">📱 Preview</p>
                  <div className="bg-slate-800 rounded-xl p-3 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">B</div>
                    <div>
                      <p className="text-xs text-white font-semibold">{title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{body||'Message preview...'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={send} disabled={sending||!title||!body} className="btn-primary disabled:opacity-50">
                <Send size={14}/>{sending?'Sending...' : scheduledAt?'Schedule':'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
