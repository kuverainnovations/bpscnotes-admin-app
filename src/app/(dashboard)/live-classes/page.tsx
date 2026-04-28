'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, Radio, Calendar, Users, RefreshCw } from 'lucide-react'

const EMPTY_FORM = {
  title: '', instructor: '', subject: '', description: '',
  meetingLink: '', scheduledAt: '', durationMins: 60,
  examTags: ['BPSC 70th CCE'],
}

export default function LiveClassesPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.liveClasses.list(), []
  )
  const classes: any[] = data?.liveClasses || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.liveClasses.update(editing.id, d) : api.liveClasses.create(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Class updated ✅' : 'Class scheduled — visible in app ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.liveClasses.update(id, { status: 'cancelled' }),
    { onSuccess: () => { refetch(); showToast('Class cancelled') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (cls: any) => {
    setEditing(cls)
    setForm({
      title: cls.title, instructor: cls.instructor || '', subject: cls.subject || '',
      description: cls.description || '', meetingLink: cls.meeting_link || '',
      scheduledAt: cls.scheduled_at ? cls.scheduled_at.slice(0, 16) : '',
      durationMins: cls.duration_mins || 60,
    })
    setShowModal(true)
  }

  const upcoming  = classes.filter(c => c.status === 'scheduled')
  const completed = classes.filter(c => c.status === 'completed')
  const cancelled = classes.filter(c => c.status === 'cancelled')

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Live Classes" subtitle="Schedule and manage live teaching sessions" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Classes',      value: classes.length,                            emoji: '🔴' },
            { label: 'Upcoming',           value: upcoming.length,                           emoji: '⏰' },
            { label: 'Completed',          value: completed.length,                          emoji: '✅' },
            { label: 'Total Registrations', value: classes.reduce((a, c) => a + parseInt(c.registered_count || 0), 0), emoji: '👥' },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Schedule Class</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <div className="space-y-3">
            {classes.map(cls => (
              <div key={cls.id} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls.status === 'scheduled' ? 'bg-red-50' : cls.status === 'completed' ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <Radio size={18} className={cls.status === 'scheduled' ? 'text-red-500' : cls.status === 'completed' ? 'text-green-500' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-slate-900">{cls.title}</p>
                      <span className={`badge text-[10px] ${cls.status === 'scheduled' ? 'bg-red-100 text-red-700 border-red-200' : cls.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {cls.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{cls.instructor} · {cls.subject} · {cls.duration_mins}min</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {cls.scheduled_at ? new Date(cls.scheduled_at).toLocaleString() : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {cls.registered_count || 0} registered
                      </span>
                      {cls.exam_tags?.map((t: string) => (
                        <span key={t} className="badge bg-blue-50 text-blue-600 border-blue-100">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(cls)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors">
                      <Edit size={13} className="text-yellow-600" />
                    </button>
                    {cls.status !== 'cancelled' && (
                      <button onClick={() => remove(cls.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Trash2 size={13} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-3">🎓</p>
                <p className="font-bold text-slate-800">No live classes scheduled</p>
                <p className="text-slate-400 text-sm mt-1">Schedule your first live class</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Class' : 'Schedule Live Class'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="e.g. Bihar GK Live Session" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Instructor</label>
                  <input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} className="input" placeholder="Instructor name" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input">
                    <option value="">Select</option>
                    {['Polity', 'Bihar GK', 'Economy', 'History', 'Geography', 'Current Affairs', 'General Studies'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="input" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration (mins)</label>
                  <input type="number" value={form.durationMins} onChange={e => setForm({ ...form, durationMins: Number(e.target.value) })} className="input" />
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Meeting Link</label>
                <input type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} className="input" placeholder="https://meet.google.com/..." />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving || !form.title || !form.scheduledAt} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
