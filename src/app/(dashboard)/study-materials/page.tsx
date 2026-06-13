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
  { key:'pending',     label:'Pending Review', color:'text-amber-600 bg-amber-50 border-amber-200' },
  { key:'negotiating', label:'Negotiating',    color:'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { key:'approved',    label:'Approved',       color:'text-green-600 bg-green-50 border-green-200' },
  { key:'rejected',    label:'Rejected',       color:'text-red-600 bg-red-50 border-red-200' },
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
  const [view, setView]           = useState<'materials' | 'wallets' | 'revenue'>('materials')
  const [status,    setStatus]    = useState('pending')
  const [search,    setSearch]    = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [stats,     setStats]     = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  // Seller wallets
  const [wallets, setWallets]         = useState<any[]>([])
  const [walletTotals, setWalletTotals] = useState<any>(null)
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [walletPage, setWalletPage]   = useState(1)
  const [walletTotal, setWalletTotal] = useState(0)
  const [walletSearch, setWalletSearch] = useState('')
  const [walletDetail, setWalletDetail] = useState<any>(null)  // selected seller's transaction view
  const [walletDetailLoading, setWalletDetailLoading] = useState(false)
  // Per-material platform revenue
  const [revenueRows, setRevenueRows]   = useState<any[]>([])
  const [revenueTotals, setRevenueTotals] = useState<any>(null)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenuePage, setRevenuePage]   = useState(1)
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [revenueSearch, setRevenueSearch] = useState('')
  const [previewItem, setPreviewItem] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [counterTarget, setCounterTarget] = useState<any>(null)
  const [counterPrice, setCounterPrice]   = useState('')
  const [counterMessage, setCounterMessage] = useState('')
  const [finalTarget, setFinalTarget]     = useState<any>(null)
  const [finalPrice, setFinalPrice]       = useState('')
  const [finalReason, setFinalReason]     = useState('')
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
  }, [status, page, search])

  useEffect(() => { setPage(1); setMaterials([]) }, [status])
  // Page/status/view changes trigger an immediate load.
  useEffect(() => { if (view === 'materials') { load(); loadStats() } }, [status, page, view])

  // Search input is debounced separately — typing resets to page 1 and
  // refetches shortly after the user stops typing, instead of firing on
  // every keystroke (and previously, not firing at all — `load` never
  // depended on `search`, so the search box had no effect).
  useEffect(() => {
    if (view !== 'materials') return
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else load()
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  // ── Seller wallets ──────────────────────────────────────────
  const loadWallets = useCallback(async () => {
    setWalletsLoading(true)
    try {
      const res = await api.studyMaterials.listWallets({ page: walletPage, limit: LIMIT, search: walletSearch || undefined })
      setWallets(res.data?.wallets ?? [])
      setWalletTotals(res.data?.totals ?? null)
      setWalletTotal(res.meta?.total ?? res.data?.meta?.total ?? 0)
    } catch (e: any) { showToast(e.message || 'Failed to load wallets', 'error') }
    finally { setWalletsLoading(false) }
  }, [walletPage, walletSearch])

  useEffect(() => { setWalletPage(1) }, [walletSearch])
  useEffect(() => { if (view === 'wallets') loadWallets() }, [loadWallets, view])

  // ── Per-material platform revenue ───────────────────────────
  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true)
    try {
      const res = await api.studyMaterials.getMaterialRevenue({ page: revenuePage, limit: LIMIT, search: revenueSearch || undefined })
      setRevenueRows(res.data?.materials ?? [])
      setRevenueTotals(res.data?.totals ?? null)
      setRevenueTotal(res.meta?.total ?? res.data?.meta?.total ?? 0)
    } catch (e: any) { showToast(e.message || 'Failed to load revenue', 'error') }
    finally { setRevenueLoading(false) }
  }, [revenuePage, revenueSearch])

  useEffect(() => { setRevenuePage(1) }, [revenueSearch])
  useEffect(() => { if (view === 'revenue') loadRevenue() }, [loadRevenue, view])

  const openWalletDetail = async (userId: string) => {
    setWalletDetailLoading(true)
    setWalletDetail({ userId })  // open modal immediately with loading state
    try {
      const res = await api.studyMaterials.getWalletTransactions(userId)
      setWalletDetail({ userId, ...res.data })
    } catch (e: any) {
      showToast(e.message || 'Failed to load transactions', 'error')
      setWalletDetail(null)
    } finally { setWalletDetailLoading(false) }
  }

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

  // ── Negotiation: send a counter-offer instead of outright reject ──
  const sendCounterOffer = async () => {
    if (!counterTarget) return
    const price = parseInt(counterPrice, 10)
    if (isNaN(price) || price < 0) { showToast('Enter a valid price', 'error'); return }
    setProcessing(counterTarget.id)
    try {
      const res = await api.studyMaterials.counterOffer(counterTarget.id, price, counterMessage || undefined)
      showToast(res.message || 'Counter-offer sent 💬')
      setCounterTarget(null); setCounterPrice(''); setCounterMessage(''); load(); loadStats()
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setProcessing(null) }
  }

  // ── Negotiation: final call after round 3 — approve or reject ──
  const submitFinalDecision = async (action: 'approve' | 'reject') => {
    if (!finalTarget) return
    setProcessing(finalTarget.id)
    try {
      const price = action === 'approve' && finalPrice.trim() ? parseInt(finalPrice, 10) : undefined
      const res = await api.studyMaterials.finalDecision(finalTarget.id, action, price, finalReason || undefined)
      showToast(res.message || (action === 'approve' ? 'Approved ✅' : 'Rejected'))
      setFinalTarget(null); setFinalPrice(''); setFinalReason(''); load(); loadStats()
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

  const walletTotalPages = Math.ceil(walletTotal / LIMIT)
  const walletFrom = walletTotal === 0 ? 0 : (walletPage - 1) * LIMIT + 1
  const walletTo   = Math.min(walletPage * LIMIT, walletTotal)

  const revenueTotalPages = Math.ceil(revenueTotal / LIMIT)
  const revenueFrom = revenueTotal === 0 ? 0 : (revenuePage - 1) * LIMIT + 1
  const revenueTo   = Math.min(revenuePage * LIMIT, revenueTotal)

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Study Materials" subtitle="Review uploads and manage the content library" />

      <div className="p-6 space-y-5">

        {/* Stats — Issue 2: show real values */}
        {view === 'materials' && stats && (
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

        {/* View toggle: Materials vs Seller Wallets vs Revenue */}
        <div className="flex items-center gap-2">
          <button onClick={() => setView('materials')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${view === 'materials' ? 'text-brand-700 bg-brand-50 border-brand-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
            📚 Materials
          </button>
          <button onClick={() => setView('wallets')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${view === 'wallets' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
            💰 Seller Wallets
          </button>
          <button onClick={() => setView('revenue')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${view === 'revenue' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
            📊 Platform Revenue
          </button>
        </div>


        {/* Search + Tabs */}
        {view === 'materials' && (
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
        )}

        {/* Materials List */}
        {view === 'materials' && (loading ? (

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

                      {/* Negotiation status banner */}
                      {m.status === 'negotiating' && (
                        <div className="mt-2 flex items-start gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-2">
                          <span className="text-[11px] shrink-0 mt-0.5">💬</span>
                          <div className="text-xs text-indigo-700">
                            <span className="font-semibold">
                              Negotiation round {m.negotiation_round}/3 —{' '}
                            </span>
                            {m.proposed_by === 'admin' ? (
                              <>Awaiting uploader's response to <b>₹{m.current_offer_price}</b> (your offer)</>
                            ) : (
                              <>Uploader countered with <b>₹{m.current_offer_price}</b> (original: ₹{m.price})</>
                            )}
                            {m.negotiation_round >= 3 && m.proposed_by === 'user' && m.negotiation_status === 'awaiting_admin' && (
                              <span className="block mt-1 font-semibold text-indigo-900">
                                ⚠️ Final round reached — make a final decision below
                              </span>
                            )}
                          </div>
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

                      <button onClick={() => api.studyMaterials.toggleFeatured(m.id).then(() => { load(); loadStats() })}
                        className={`p-2 rounded-xl transition-colors ${m.isFeatured ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                        title="Toggle Featured"><Pin size={14}/></button>
                      <button onClick={() => api.studyMaterials.toggleTrending(m.id).then(() => { load(); loadStats() })}
                        className={`p-2 rounded-xl transition-colors ${m.isTrending ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                        title="Toggle Trending"><TrendingUp size={14}/></button>

                      {m.status === 'pending' && (
                        <>
                          <button onClick={() => approve(m.id)} disabled={processing === m.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                            <CheckCircle size={13}/>
                            {processing === m.id ? '…' : 'Approve'}
                          </button>
                          {m.price > 0 && (
                            <button onClick={() => { setCounterTarget(m); setCounterPrice(String(m.price)); setCounterMessage('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors">
                              💬 Counter Offer
                            </button>
                          )}
                          <button onClick={() => setRejectTarget(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors">
                            <XCircle size={13}/> Reject
                          </button>
                        </>
                      )}

                      {m.status === 'negotiating' && (
                        <>
                          {m.negotiation_round >= 3 && m.negotiation_status === 'awaiting_admin' ? (
                            // Final round exhausted — admin must approve or reject permanently
                            <button onClick={() => { setFinalTarget(m); setFinalPrice(String(m.current_offer_price ?? m.price)); setFinalReason('') }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors">
                              ⚖️ Final Decision
                            </button>
                          ) : m.negotiation_status === 'awaiting_admin' ? (
                            // Uploader countered, admin can counter again (rounds < 3) or accept their price
                            <>
                              <button onClick={async () => {
                                  setProcessing(m.id)
                                  try {
                                    const res = await api.studyMaterials.finalDecision(m.id, 'approve', m.current_offer_price)
                                    showToast(res.message || 'Approved ✅'); load(); loadStats()
                                  } catch (e: any) { showToast(e.message, 'error') }
                                  finally { setProcessing(null) }
                                }} disabled={processing === m.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                                <CheckCircle size={13}/> Accept ₹{m.current_offer_price}
                              </button>
                              <button onClick={() => { setCounterTarget(m); setCounterPrice(String(m.current_offer_price ?? m.price)); setCounterMessage('') }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors">
                                💬 Counter Again
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic px-2">Waiting for uploader's response…</span>
                          )}
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
        ))}

        {/* Materials Pagination */}
        {view === 'materials' && total > 0 && (
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

        {/* ── Seller Wallets view ──────────────────────────────── */}
        {view === 'wallets' && (
          <>
            {/* Platform totals */}
            {walletTotals && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Total Seller Balance</p>
                  <p className="text-xl font-black text-emerald-600">₹{(walletTotals.total_balance ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Lifetime Disbursed</p>
                  <p className="text-xl font-black text-indigo-600">₹{(walletTotals.total_disbursed ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Platform Revenue</p>
                  <p className="text-xl font-black text-amber-600">₹{(walletTotals.platform_revenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Active Sellers</p>
                  <p className="text-xl font-black text-slate-700">{(walletTotals.seller_count ?? 0).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-3">
              <input value={walletSearch} onChange={e => setWalletSearch(e.target.value)}
                placeholder="Search seller name or mobile..."
                className="input pl-4 text-sm w-64" />
              <button onClick={loadWallets} className="ml-auto btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
            </div>

            {/* Wallets table */}
            {walletsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="card p-5 animate-pulse h-14" />
                ))}
              </div>
            ) : wallets.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                No sellers have earned wallet balances yet.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-3">Seller</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-right">Total Earned</th>
                      <th className="px-4 py-3 text-center">Transactions</th>
                      <th className="px-4 py-3 text-center">Pending</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wallets.map((w: any) => (
                      <tr key={w.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{w.uploader_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{w.mobile || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{(w.balance ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{(w.total_earned ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{w.transaction_count}</td>
                        <td className="px-4 py-3 text-center">
                          {w.pending_count > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {w.pending_count} pending
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openWalletDetail(w.user_id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Wallets pagination */}
            {walletTotal > 0 && (
              <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{walletFrom}</span>–<span className="font-semibold text-slate-700">{walletTo}</span> of <span className="font-semibold text-slate-700">{walletTotal}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button disabled={walletPage===1} onClick={()=>setWalletPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14}/></button>
                  <button disabled={walletPage===1} onClick={()=>setWalletPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14}/></button>
                  {Array.from({length: Math.min(walletTotalPages, 7)}, (_, i) => {
                    const p = walletTotalPages <= 7 ? i+1 : walletPage<=4 ? i+1 : walletPage>=walletTotalPages-3 ? walletTotalPages-6+i : walletPage-3+i
                    return (
                      <button key={p} onClick={()=>setWalletPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                          ${p===walletPage ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button disabled={walletPage>=walletTotalPages} onClick={()=>setWalletPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14}/></button>
                  <button disabled={walletPage>=walletTotalPages} onClick={()=>setWalletPage(walletTotalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14}/></button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Per-material Platform Revenue view ──────────────── */}
        {view === 'revenue' && (
          <>
            {revenueTotals && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Total Collected</p>
                  <p className="text-xl font-black text-slate-700">₹{(revenueTotals.total_collected ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Paid to Sellers</p>
                  <p className="text-xl font-black text-emerald-600">₹{(revenueTotals.total_seller_payout ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Platform Revenue</p>
                  <p className="text-xl font-black text-amber-600">₹{(revenueTotals.total_platform_revenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-slate-500 font-medium">Total Sales</p>
                  <p className="text-xl font-black text-slate-700">{(revenueTotals.total_sales ?? 0).toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input value={revenueSearch} onChange={e => setRevenueSearch(e.target.value)}
                placeholder="Search material title or seller..."
                className="input pl-4 text-sm w-64" />
              <button onClick={loadRevenue} className="ml-auto btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
            </div>

            {revenueLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="card p-5 animate-pulse h-14" />
                ))}
              </div>
            ) : revenueRows.length === 0 ? (
              <div className="card p-10 text-center text-slate-400">
                No paid sales yet.
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-4 py-3">Material</th>
                      <th className="px-4 py-3">Seller</th>
                      <th className="px-4 py-3 text-center">Sales</th>
                      <th className="px-4 py-3 text-right">Collected</th>
                      <th className="px-4 py-3 text-right">Seller Payout</th>
                      <th className="px-4 py-3 text-right">Platform Revenue</th>
                      <th className="px-4 py-3">Last Sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenueRows.map((r: any) => (
                      <tr key={r.material_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700 max-w-[220px] truncate">{r.title}</td>
                        <td className="px-4 py-3 text-slate-500">{r.uploader_name || '—'}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{r.sale_count}</td>
                        <td className="px-4 py-3 text-right text-slate-700">₹{(r.total_collected ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">₹{(r.seller_payout ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">₹{(r.platform_revenue ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {r.last_sale_at ? new Date(r.last_sale_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {revenueTotal > 0 && (
              <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{revenueFrom}</span>–<span className="font-semibold text-slate-700">{revenueTo}</span> of <span className="font-semibold text-slate-700">{revenueTotal}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button disabled={revenuePage===1} onClick={()=>setRevenuePage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsLeft size={14}/></button>
                  <button disabled={revenuePage===1} onClick={()=>setRevenuePage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14}/></button>
                  {Array.from({length: Math.min(revenueTotalPages, 7)}, (_, i) => {
                    const p = revenueTotalPages <= 7 ? i+1 : revenuePage<=4 ? i+1 : revenuePage>=revenueTotalPages-3 ? revenueTotalPages-6+i : revenuePage-3+i
                    return (
                      <button key={p} onClick={()=>setRevenuePage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                          ${p===revenuePage ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button disabled={revenuePage>=revenueTotalPages} onClick={()=>setRevenuePage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={14}/></button>
                  <button disabled={revenuePage>=revenueTotalPages} onClick={()=>setRevenuePage(revenueTotalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronsRight size={14}/></button>
                </div>
              </div>
            )}
          </>
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

      {/* Counter Offer dialog */}
      {counterTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCounterTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">💬 Send Counter-Offer</p>
              <button onClick={() => setCounterTarget(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14}/>
              </button>
            </div>
            <p className="text-sm text-slate-600">"{counterTarget.title}"</p>
            <p className="text-xs text-slate-400">
              Uploader's price: <span className="font-semibold text-slate-600">₹{counterTarget.current_offer_price ?? counterTarget.price}</span>
              {' '}· Round {(counterTarget.negotiation_round ?? 0) + 1}/3
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Your suggested price (₹) *</label>
              <input type="number" min={0} value={counterPrice} onChange={e=>setCounterPrice(e.target.value)}
                placeholder="e.g. 200" className="input w-full" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Message (optional)</label>
              <textarea rows={2} value={counterMessage} onChange={e=>setCounterMessage(e.target.value)}
                placeholder="e.g. Not worth ₹500 for 10 pages, suggest ₹200"
                className="input w-full resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCounterTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={sendCounterOffer} disabled={!counterPrice.trim() || processing === counterTarget.id}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {processing === counterTarget.id ? 'Sending…' : 'Send Counter-Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Decision dialog — after round 3 negotiation is exhausted */}
      {finalTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setFinalTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">⚖️ Final Decision</p>
              <button onClick={() => setFinalTarget(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14}/>
              </button>
            </div>
            <p className="text-sm text-slate-600">"{finalTarget.title}"</p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              3 negotiation rounds are complete. The uploader's last offer was{' '}
              <b>₹{finalTarget.current_offer_price ?? finalTarget.price}</b> (original: ₹{finalTarget.price}).
              You can approve at any price, or reject permanently.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Approve at price (₹)</label>
              <input type="number" min={0} value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}
                placeholder="Defaults to uploader's last offer" className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Reason (shown to uploader)</label>
              <textarea rows={2} value={finalReason} onChange={e=>setFinalReason(e.target.value)}
                placeholder="Optional note for the uploader"
                className="input w-full resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => submitFinalDecision('reject')} disabled={processing === finalTarget.id}
                className="flex-1 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {processing === finalTarget.id ? '…' : 'Reject Permanently'}
              </button>
              <button onClick={() => submitFinalDecision('approve')} disabled={processing === finalTarget.id}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {processing === finalTarget.id ? '…' : `Approve at ₹${finalPrice || (finalTarget.current_offer_price ?? finalTarget.price)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Detail dialog — seller's full transaction ledger */}
      {walletDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWalletDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">💰 {walletDetail.uploaderName || 'Seller'} — Wallet Ledger</p>
                {walletDetail.mobile && <p className="text-xs text-slate-400">{walletDetail.mobile}</p>}
              </div>
              <button onClick={() => setWalletDetail(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14}/>
              </button>
            </div>

            {walletDetailLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs text-emerald-600 font-medium">Current Balance</p>
                    <p className="text-lg font-black text-emerald-700">₹{(walletDetail.balance ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                    <p className="text-xs text-indigo-600 font-medium">Total Earned (Lifetime)</p>
                    <p className="text-lg font-black text-indigo-700">₹{(walletDetail.totalEarned ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  {(walletDetail.transactions ?? []).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No transactions yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200">
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                          <th className="py-2">Material</th>
                          <th className="py-2">Date</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {walletDetail.transactions.map((t: any) => {
                          const isCredit = t.type === 'sale_credit'
                          const statusColor = t.status === 'disbursed' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                            : t.status === 'pending' ? 'text-amber-600 bg-amber-50 border-amber-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                          return (
                            <tr key={t.id}>
                              <td className="py-2 font-semibold text-slate-700 max-w-[180px] truncate">
                                {t.material_title || t.description || (isCredit ? 'Sale credit' : t.type)}
                              </td>
                              <td className="py-2 text-slate-400 whitespace-nowrap">
                                {t.created_at ? new Date(t.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                              </td>
                              <td className="py-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}>{t.status}</span>
                              </td>
                              <td className={`py-2 text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isCredit ? '+' : '−'}₹{t.amount}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Preview with video support */}
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