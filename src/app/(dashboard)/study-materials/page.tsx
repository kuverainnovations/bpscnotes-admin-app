'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  RefreshCw, CheckCircle, XCircle, Star, Trash2,
  Eye, Pin, TrendingUp, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Users, HardDrive, Download,
  Calendar, PlayCircle, FileText, Volume2,
} from 'lucide-react'

const STATUS_TABS = [
  { key:'pending',  label:'Pending Review', color:'text-amber-600 bg-amber-50 border-amber-200' },
  { key:'approved', label:'Approved',       color:'text-green-600 bg-green-50 border-green-200' },
  { key:'rejected', label:'Rejected',       color:'text-red-600 bg-red-50 border-red-200' },
]

const TYPE_META: Record<string,{ emoji:string; label:string; color:string; bg:string }> = {
  pdf:   { emoji:'📄', label:'PDF Notes',    color:'text-red-700',    bg:'bg-red-50 border-red-200' },
  pyq:   { emoji:'📝', label:'Prev. Papers', color:'text-purple-700', bg:'bg-purple-50 border-purple-200' },
  book:  { emoji:'📚', label:'Book',         color:'text-blue-700',   bg:'bg-blue-50 border-blue-200' },
  video: { emoji:'🎬', label:'Video Notes',  color:'text-orange-700', bg:'bg-orange-50 border-orange-200' },
}

const LIMIT = 15

function fmt(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB'
  return (bytes/1048576).toFixed(1) + ' MB'
}

// ── Preview Modal ─────────────────────────────────────────────
// Issue 1: Handles PDF, image AND video
function PreviewModal({ url, title, type, onClose }: { url:string; title:string; type:string; onClose:()=>void }) {
  // Detect type: check explicit type first, then URL pattern (handles query params)
  const isVideo = type === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
  const isImage = !isVideo && (
    type === 'image' ||
    /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url) ||
    // Cloudinary/S3 image URLs may not have extension — check path
    /\/image\/upload\//i.test(url)
  )
  const isPdf = !isVideo && !isImage && (
    type === 'pdf' || type === 'pyq' || type === 'book' ||
    /\.pdf(\?|$)/i.test(url) ||
    url.includes('docs.google.com')
  )

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span>{TYPE_META[type]?.emoji || '📄'}</span>
            <p className="font-semibold text-slate-900 truncate text-sm">{title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors">
              ↗ Open in new tab
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X size={15} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          {isVideo && (
            // Issue 1: Native video player for video content
            <div className="w-full h-full flex items-center justify-center bg-black p-4">
              <video
                src={url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl shadow-xl"
                style={{ maxHeight: 'calc(88vh - 80px)' }}
              >
                <source src={url} />
                Your browser does not support video playback.
              </video>
            </div>
          )}
          {isPdf && (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="w-full h-full border-0"
              title="PDF Preview"
              onError={() => {/* google viewer failed */}}
            />
          )}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-slate-100">
              <img
                src={url}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  const msg = el.nextSibling as HTMLElement
                  if (msg) msg.style.display = 'flex'
                }}
              />
              <div style={{display:'none'}} className="flex-col items-center gap-3 text-center">
                <span className="text-5xl">🖼️</span>
                <p className="font-bold text-slate-600">Image could not load</p>
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-600 underline">Open image URL directly ↗</a>
              </div>
            </div>
          )}
          {!isVideo && !isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
              <span className="text-6xl">📄</span>
              <p className="font-bold text-slate-700">Preview not available for this file type</p>
              <a href={url} target="_blank" rel="noreferrer"
                className="text-sm text-blue-600 underline">Open in new tab ↗</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudyMaterialsAdminPage() {
  const { showToast, ToastComponent } = useToast()
  const [status,    setStatus]    = useState('pending')
  const [search,    setSearch]    = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [stats,     setStats]     = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [previewItem, setPreviewItem] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing]    = useState<string|null>(null)

  const loadStats = useCallback(async () => {
    try { const res = await api.studyMaterials.adminStats(); setStats(res.data) } catch {}
  }, [])

  // Issue 3: Pass page + limit for pagination
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.studyMaterials.adminList({ status, page, limit: LIMIT, search: search || undefined })
      setMaterials(res.data?.materials ?? [])
      setTotal(res.meta?.total ?? res.data?.total ?? 0)
    } catch (e: any) { showToast(e.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }, [status, page])

  useEffect(() => { setPage(1); setMaterials([]) }, [status])
  useEffect(() => { load(); loadStats() }, [load, loadStats])

  const approve = async (id: string) => {
    setProcessing(id)
    try { await api.studyMaterials.approve(id); showToast('Approved & published ✅'); load(); loadStats() }
    catch (e: any) { showToast(e.message, 'error') }
    finally { setProcessing(null) }
  }

  const reject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return
    setProcessing(rejectTarget.id)
    try {
      await api.studyMaterials.reject(rejectTarget.id, rejectReason)
      showToast('Material rejected')
      setRejectTarget(null); setRejectReason(''); load(); loadStats()
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setProcessing(null) }
  }

  const deleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setMaterials(prev => prev.filter(m => m.id !== id))
    try { await api.studyMaterials.delete(id); showToast('Deleted ✅'); loadStats() }
    catch (e: any) { showToast(e.message, 'error'); load() }
  }

  const preview = async (m: any) => {
    try {
      const res = await api.studyMaterials.signedUrl(m.id)
      const url = res.data?.url
      if (!url) { showToast('No file URL available', 'error'); return }
      setPreviewItem({ ...m, url })
    } catch { showToast('Preview unavailable', 'error') }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to   = Math.min(page * LIMIT, total)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Study Materials" subtitle="Review uploads and manage the content library" />

      <div className="p-6 space-y-5">

        {/* Stats — Issue 2: show real values */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { emoji:'⏳', label:'Pending',     value:stats.pending,         color:'text-amber-600',  bg:'bg-amber-50' },
              { emoji:'✅', label:'Approved',    value:stats.approved,        color:'text-green-600',  bg:'bg-green-50' },
              { emoji:'❌', label:'Rejected',    value:stats.rejected,        color:'text-red-600',    bg:'bg-red-50' },
              { emoji:'📌', label:'Featured',    value:stats.featured,        color:'text-blue-600',   bg:'bg-blue-50' },
              { emoji:'⬇️', label:'Downloads',  value:stats.totalDownloads,  color:'text-slate-700',  bg:'bg-slate-50' },
              { emoji:'👥', label:'Contributors',value:stats.contributors,    color:'text-slate-700',  bg:'bg-slate-50' },
            ].map(s => (
              <div key={s.label} className={`card p-4 ${s.bg} flex items-center gap-3`}>
                <span className="text-xl">{s.emoji}</span>
                <div>
                  <p className={`text-xl font-black ${s.color}`}>{(s.value ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search title, subject, uploader..."
              className="input pl-4 text-sm w-64" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                ${status === t.key ? t.color : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
          </div>
          <button onClick={load} className="ml-auto btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="card p-20 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-bold text-slate-700 text-lg">No {status} materials</p>
            <p className="text-sm text-slate-400">Nothing to review right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m: any) => {
              const meta = TYPE_META[m.materialType] ?? TYPE_META['pdf']
              const isVideo = m.materialType === 'video'
              return (
                <div key={m.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border shrink-0 ${meta.bg}`}>
                      {meta.emoji}
                    </div>

                    {/* Content — Issue 2: show all metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="font-bold text-slate-900 truncate">{m.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        {isVideo && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                            <PlayCircle size={9} /> Video
                          </span>
                        )}
                        {m.isFeatured  && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">📌 Featured</span>}
                        {m.isTrending  && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-700 border border-orange-200">🔥 Trending</span>}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-1.5">
                        {(m.subject || m.exam_tag) && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <FileText size={11} className="text-slate-400" />
                            {m.subject || m.exam_tag}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          {m.uploaderName || m.uploader_name || m.uploaded_by_name || '—'}
                        </span>
                        {(m.fileSizeBytes || m.file_size_bytes) ? (
                          <span className="flex items-center gap-1">
                            <HardDrive size={11} className="text-slate-400" />
                            {fmt(m.fileSizeBytes || m.file_size_bytes)}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Download size={11} className="text-slate-400" />
                          {(m.downloadCount ?? m.download_count ?? 0).toLocaleString()} downloads
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          {(() => {
                            const d = m.createdAt || m.created_at
                            return d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'
                          })()}
                        </span>
                      </div>

                      {m.status === 'rejected' && (m.rejection_reason || m.rejectionReason) && (
                        <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                          <XCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                          <p className="text-xs text-red-700 font-medium">
                            <span className="text-red-400">Reason: </span>
                            {m.rejection_reason || m.rejectionReason}
                          </p>
                        </div>
                      )}

                      {/* Student's message to admin */}
                      {(m.description) && m.status === 'pending' && (
                        <div className="mt-2 flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
                          <span className="text-[11px] shrink-0 mt-0.5">💬</span>
                          <p className="text-xs text-blue-700">
                            <span className="font-semibold text-blue-500">Student note: </span>
                            {m.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button onClick={() => preview(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                        {isVideo ? <PlayCircle size={13}/> : <Eye size={13}/>}
                        {isVideo ? 'Play' : 'Preview'}
                      </button>

                      {m.status === 'approved' && (
                        <>
                          <button onClick={() => api.studyMaterials.toggleFeatured(m.id).then(() => load())}
                            className={`p-2 rounded-xl transition-colors ${m.isFeatured ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                            title="Toggle Featured"><Pin size={14}/></button>
                          <button onClick={() => api.studyMaterials.toggleTrending(m.id).then(() => load())}
                            className={`p-2 rounded-xl transition-colors ${m.isTrending ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                            title="Toggle Trending"><TrendingUp size={14}/></button>
                        </>
                      )}

                      {m.status === 'pending' && (
                        <>
                          <button onClick={() => approve(m.id)} disabled={processing === m.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                            <CheckCircle size={13}/>
                            {processing === m.id ? '…' : 'Approve'}
                          </button>
                          <button onClick={() => setRejectTarget(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors">
                            <XCircle size={13}/> Reject
                          </button>
                        </>
                      )}

                      <button onClick={() => deleteMaterial(m.id, m.title)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Issue 3: Pagination */}
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

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Reject Material</p>
              <button onClick={() => setRejectTarget(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14}/>
              </button>
            </div>
            <p className="text-sm text-slate-600">"{rejectTarget.title}"</p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Reason *</label>
              <textarea rows={3} value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
                placeholder="e.g. Duplicate content, low quality, incorrect subject…"
                className="input w-full resize-none" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={reject} disabled={!rejectReason.trim() || processing === rejectTarget.id}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {processing === rejectTarget.id ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue 1: Preview with video support */}
      {previewItem && (
        <PreviewModal
          url={previewItem.url}
          title={previewItem.title}
          type={previewItem.materialType || previewItem.material_type || 'pdf'}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}