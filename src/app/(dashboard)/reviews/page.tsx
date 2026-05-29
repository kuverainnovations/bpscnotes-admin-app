'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { CheckCircle, XCircle, Eye, RefreshCw, BookOpen, X, Calendar, User } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function ReviewsPage() {
  const { showToast, ToastComponent } = useToast()
  const [preview, setPreview] = useState<any>(null)

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.library.getPending(), []
  )
  const notes: any[] = data?.notes || []

  const { mutate: review } = useMutation(
    (id: string, action: string) => api.library.review(id, action),
    {
      onSuccess: (_data, args?: any[]) => {
        refetch()
        showToast(args?.[1] === 'published' ? 'Approved — now live ✅' : 'Rejected')
      },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Content Reviews" subtitle="Approve or reject user-uploaded study materials" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { emoji:'⏳', label:'Pending',  value:notes.length,                               color:'text-amber-700',  bg:'bg-amber-50' },
            { emoji:'📚', label:'Subjects', value:new Set(notes.map((n:any)=>n.subject)).size, color:'text-blue-700',   bg:'bg-blue-50' },
            { emoji:'👥', label:'Authors',  value:new Set(notes.map((n:any)=>n.uploader_name||n.user_id)).size, color:'text-slate-700', bg:'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.bg}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{notes.length} item{notes.length !== 1 ? 's' : ''} awaiting review</p>
          <button onClick={refetch} className="btn-secondary px-3 py-2"><RefreshCw size={13}/></button>
        </div>

        {loading ? <PageLoader /> : error ? <ErrorMessage message={error} onRetry={refetch} /> :
          notes.length === 0 ? (
            <div className="card p-16 text-center">
              <CheckCircle size={40} className="mx-auto mb-4 text-green-300"/>
              <p className="font-bold text-slate-700 text-lg mb-1">All caught up!</p>
              <p className="text-sm text-slate-400">No pending reviews right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note: any) => (
                <div key={note.id} className="card p-5 hover:shadow-md transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-brand-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-slate-900 leading-snug">{note.title}</h3>
                        <div className="flex gap-1 shrink-0">
                          {note.subject && <span className="badge bg-brand-50 text-brand-700 border-brand-200">{note.subject}</span>}
                          <span className="badge bg-slate-100 text-slate-600 border-slate-200">{note.type || 'PDF'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        {note.uploader_name && <span className="flex items-center gap-1"><User size={10}/> {note.uploader_name}</span>}
                        {note.created_at && <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(note.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                        {note.file_size_bytes && <span>{(note.file_size_bytes/1048576).toFixed(1)} MB</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setPreview(note)}
                        className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors" title="Preview">
                        <Eye size={14} className="text-blue-600"/>
                      </button>
                      <button onClick={() => review(note.id, 'published')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors">
                        <CheckCircle size={13}/> Approve
                      </button>
                      <button onClick={() => review(note.id, 'rejected')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors">
                        <XCircle size={13}/> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-white">{preview.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{preview.subject} · {preview.type || 'PDF'}</p>
              </div>
              <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"><X size={13} className="text-white"/></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {[
                { label:'Uploader',   value:preview.uploader_name||'—' },
                { label:'Submitted',  value:preview.created_at ? new Date(preview.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—' },
                { label:'File Size',  value:preview.file_size_bytes ? (preview.file_size_bytes/1048576).toFixed(1)+' MB' : '—' },
                { label:'Downloads',  value:(preview.download_count||0).toLocaleString() },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-400 font-medium">{r.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{r.value}</span>
                </div>
              ))}
              {preview.description && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">{preview.description}</div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => { review(preview.id, 'rejected'); setPreview(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl border border-red-200">
                <XCircle size={15}/> Reject
              </button>
              <button onClick={() => { review(preview.id, 'published'); setPreview(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl">
                <CheckCircle size={15}/> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}