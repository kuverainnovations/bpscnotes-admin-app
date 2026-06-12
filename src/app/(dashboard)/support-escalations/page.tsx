'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData } from '@/lib/hooks'
import { useToast } from '@/components/ui/feedback'
import { RefreshCw, X, MessageCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const LIMIT = 20

const STATUS_TABS = [
  { key: 'open',        label: 'Open',        color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'in_progress', label: 'In Progress', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { key: 'resolved',    label: 'Resolved',    color: 'text-green-600 bg-green-50 border-green-200' },
  { key: '',            label: 'All',         color: 'text-slate-700 bg-slate-100 border-slate-300' },
]

const CATEGORY_LABELS: Record<string, string> = {
  refund: '💰 Refund',
  dispute: '⚖️ Dispute',
  content: '📄 Content issue',
  seller_misconduct: '🚫 Seller misconduct',
  other: '❓ Other',
}

export default function SupportEscalationsPage() {
  const { showToast, ToastComponent } = useToast()
  const [status, setStatus] = useState('open')
  const [page, setPage]     = useState(1)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [statusDraft, setStatusDraft] = useState('open')
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, loading, refetch, meta } = useApiData<any>(
    () => api.supportEscalations.list({ status: status || undefined, page, limit: LIMIT }),
    [status, page]
  )

  useEffect(() => { setPage(1) }, [status])

  const escalations: any[] = data?.escalations ?? []
  const total = meta?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to   = Math.min(page * LIMIT, total)

  const openDetail = async (escalation: any) => {
    setDetail({ ...escalation })
    setStatusDraft(escalation.status)
    setNoteDraft(escalation.resolution_note || '')
    setDetailLoading(true)
    try {
      const res = await api.supportEscalations.getChat(escalation.id)
      setDetail((prev: any) => ({ ...prev, ...res.data }))
    } catch (e: any) {
      showToast(e.message || 'Failed to load conversation', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!detail) return
    setSaving(true)
    try {
      await api.supportEscalations.update(detail.escalation?.id || detail.id, { status: statusDraft, resolutionNote: noteDraft })
      showToast('Escalation updated ✅')
      setDetail(null)
      refetch()
    } catch (e: any) {
      showToast(e.message || 'Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Support Escalations" subtitle="Reports raised from marketplace material chats — refunds, disputes, content issues, and seller misconduct" />

      <div className="p-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_TABS.map(t => (
              <button key={t.key} onClick={() => setStatus(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${status === t.key ? t.color : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={refetch} className="ml-auto btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : escalations.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            No escalations {status ? `with status "${status}"` : ''} found.
          </div>
        ) : (
          <div className="space-y-3">
            {escalations.map((e: any) => {
              const statusColor = e.status === 'open' ? 'text-red-600 bg-red-50 border-red-200'
                : e.status === 'in_progress' ? 'text-amber-600 bg-amber-50 border-amber-200'
                : 'text-green-600 bg-green-50 border-green-200'
              return (
                <div key={e.id} className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetail(e)}>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <MessageCircle size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{e.material_title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                        {CATEGORY_LABELS[e.category] || e.category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>
                        {e.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{e.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Buyer: {e.buyer_name} ({e.buyer_mobile}) · Seller: {e.uploader_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {e.created_at ? new Date(e.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                    </p>
                    {e.resolved_at && (
                      <p className="text-xs text-emerald-500 whitespace-nowrap mt-1">
                        Resolved {new Date(e.resolved_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{from}</span>–<span className="font-semibold text-slate-700">{to}</span> of <span className="font-semibold text-slate-700">{total}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14}/></button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14}/></button>
              {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                const p = totalPages <= 7 ? i+1 : page<=4 ? i+1 : page>=totalPages-3 ? totalPages-6+i : page-3+i
                return (
                  <button key={p} onClick={()=>setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                      ${p===page ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14}/></button>
              <button disabled={page>=totalPages} onClick={()=>setPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal — transcript + status update */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{detail.escalation?.material_title || detail.material_title}</p>
                <p className="text-xs text-slate-400">
                  {CATEGORY_LABELS[detail.escalation?.category || detail.category] || detail.category} · Buyer: {detail.escalation?.buyer_name || detail.buyer_name} · Seller: {detail.escalation?.uploader_name || detail.uploader_name}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14}/>
              </button>
            </div>

            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-600 font-medium mb-1">Reported issue</p>
              <p className="text-sm text-slate-700">{detail.escalation?.reason || detail.reason}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Conversation</p>
              {detailLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (detail.messages ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No messages in this chat.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {detail.messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.sender_role === 'buyer' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 ${m.sender_role === 'buyer' ? 'bg-slate-100' : 'bg-brand-50'}`}>
                        <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{m.sender_role === 'buyer' ? 'Buyer' : 'Seller'}</p>
                        <p className="text-sm text-slate-700">{m.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                          {m.created_at ? new Date(m.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Update status</p>
              <div className="flex items-center gap-2">
                {['open','in_progress','resolved'].map(s => (
                  <button key={s} onClick={() => setStatusDraft(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                      ${statusDraft === s ? 'text-brand-700 bg-brand-50 border-brand-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                placeholder="Resolution note (visible to admins only)..."
                className="input w-full text-sm" rows={3} />
              <button onClick={saveStatus} disabled={saving}
                className="btn-primary w-full py-2.5 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}