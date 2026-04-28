'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, EmptyState, useToast } from '@/components/ui/feedback'
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function ReviewsPage() {
  const { showToast, ToastComponent } = useToast()
  const [previewNote, setPreview] = useState<any>(null)

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.library.getPending(), []
  )
  const notes: any[] = data?.notes || []

  const { mutate: review } = useMutation(
    (id: string, action: string) => api.library.review(id, action),
    {
      onSuccess: (_data, args: any[]) => {
        refetch()
        showToast(args[1] === 'published' ? 'Approved — now live in app ✅' : 'Rejected')
      },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Review Uploads" subtitle="Approve or reject user-submitted content" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Pending Review', value: notes.length,                                  emoji: '⏳', color: 'bg-yellow-50' },
            { label: 'Reviewed Today', value: 0,                                             emoji: '✅', color: 'bg-green-50' },
            { label: 'Total Uploads',  value: formatNumber(notes.length),                    emoji: '📤', color: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.color}`}>
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900">{notes.length} items pending review</p>
              <p className="text-xs text-yellow-700">Review and approve or reject user-uploaded notes before they go live.</p>
            </div>
          </div>
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <div className="card"><ErrorMessage message={error} onRetry={refetch} /></div>
        ) : notes.length === 0 ? (
          <div className="card"><EmptyState icon="✅" title="All caught up!" subtitle="No pending reviews." /></div>
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="card p-4 border-l-4 border-yellow-400">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-xl shrink-0">📄</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">{note.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      By {note.uploader_name || 'User'} · {note.subject} · {note.type?.toUpperCase()} · {note.pages || 0} pages · {note.file_size_mb || 0}MB
                    </p>
                    {note.description && <p className="text-xs text-slate-400 mt-1">{note.description}</p>}
                    {note.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {note.tags.map((t: string) => (
                          <span key={t} className="badge bg-slate-100 text-slate-600 border-slate-200 text-[10px]">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {note.file_url && (
                      <a href={note.file_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <Eye size={14} className="text-blue-600" />
                      </a>
                    )}
                    <button
                      onClick={() => review(note.id, 'published')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                    >
                      <CheckCircle size={13} />Approve
                    </button>
                    <button
                      onClick={() => review(note.id, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                    >
                      <XCircle size={13} />Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
