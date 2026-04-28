'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Users2, Lock, Unlock, Eye, RefreshCw, StopCircle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function StudyRoomsPage() {
  const [selected, setSelected] = useState<any>(null)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.studyRooms.list(), []
  )
  const rooms: any[] = data?.rooms || []
  const active   = rooms.filter(r => r.status === 'active')
  const ended    = rooms.filter(r => r.status !== 'active')

  const { mutate: endRoom } = useMutation(
    (id: string) => api.studyRooms.end(id),
    { onSuccess: () => { refetch(); showToast('Room ended') }, onError: (m) => showToast(m, 'error') }
  )

  const totalMembers = active.reduce((a, r) => a + parseInt(r.current_members || 0), 0)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Group Study Rooms" subtitle="Monitor and manage all active study rooms" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rooms',    value: rooms.length,    emoji: '🏠' },
            { label: 'Active Now',     value: active.length,   emoji: '🟢' },
            { label: 'Online Members', value: totalMembers,    emoji: '👥' },
            { label: 'Total Sessions', value: formatNumber(rooms.reduce((a, r) => a + parseInt(r.total_sessions || 0), 0)), emoji: '📊' },
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

        <div className="flex justify-end">
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} />Refresh</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <h2 className="section-title">🟢 Active Now ({active.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.map(room => {
                    const members = parseInt(room.current_members || 0)
                    const maxMembers = parseInt(room.max_members || 20)
                    const fillPct = Math.round(members / maxMembers * 100)
                    return (
                      <div key={room.id} className="card p-4 border-l-4 border-green-400">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                              <Users2 size={18} className="text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900">{room.name}</p>
                                {room.is_private && <Lock size={12} className="text-slate-400" />}
                              </div>
                              <p className="text-xs text-slate-500">Host: {room.host_name}</p>
                              <p className="text-xs text-slate-400">{room.subject}</p>
                              {room.exam_tags?.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {room.exam_tags.map((t: string) => (
                                    <span key={t} className="badge bg-blue-50 text-blue-600 border-blue-100 text-[10px]">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-sm font-bold text-slate-800">{members}/{maxMembers}</span>
                            </div>
                            <p className="text-xs text-slate-400">members</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <button onClick={() => setSelected(room)} className="btn-secondary text-xs flex-1"><Eye size={12} />View Details</button>
                          <button onClick={() => endRoom(room.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors">
                            <StopCircle size={12} />End Room
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="section-title">All Rooms History</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Room', 'Host', 'Subject', 'Members', 'Sessions', 'Privacy', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room => (
                      <tr key={room.id} className="table-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${room.status === 'active' ? 'bg-green-400' : 'bg-slate-300'}`} />
                            <span className="font-semibold text-slate-800">{room.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{room.host_name}</td>
                        <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600 border-slate-200">{room.subject}</span></td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{room.current_members}/{room.max_members}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{room.total_sessions}</td>
                        <td className="px-4 py-3">
                          {room.is_private
                            ? <span className="badge bg-slate-100 text-slate-600 border-slate-200"><Lock size={10} className="mr-1 inline" />Private</span>
                            : <span className="badge bg-green-100 text-green-700 border-green-200"><Unlock size={10} className="mr-1 inline" />Public</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${room.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {room.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected(room)} className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <Eye size={13} className="text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr><td colSpan={8} className="p-12 text-center text-slate-400">No study rooms found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {[
                ['Host',        selected.host_name],
                ['Subject',     selected.subject],
                ['Members',     `${selected.current_members}/${selected.max_members}`],
                ['Privacy',     selected.is_private ? '🔒 Private' : '🔓 Public'],
                ['Sessions',    String(selected.total_sessions || 0)],
                ['Status',      selected.status === 'active' ? '🟢 Active' : '⚫ Ended'],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">{k}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{v}</p>
                </div>
              ))}
              {selected.exam_tags?.length > 0 && (
                <div className="col-span-2 bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Exam Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selected.exam_tags.map((t: string) => (
                      <span key={t} className="badge bg-blue-100 text-blue-700 border-blue-200">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
