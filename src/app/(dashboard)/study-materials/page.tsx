'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import {
  RefreshCw, CheckCircle, XCircle, Star, Trash2,
  Eye, FileText, Pin, TrendingUp, X, AlertTriangle
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// FILE: admin/src/app/(dashboard)/study-materials/page.tsx
// Study Materials Admin Panel — pending review, approve/reject,
// feature, trend, delete, preview
// ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending Review', color: 'text-amber-600  bg-amber-50  border-amber-200' },
  { key: 'approved', label: 'Approved',        color: 'text-green-600  bg-green-50  border-green-200' },
  { key: 'rejected', label: 'Rejected',        color: 'text-red-600    bg-red-50    border-red-200'   },
]

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  pdf:   { emoji: '📄', label: 'PDF Notes',   color: 'text-red-600   bg-red-50' },
  pyq:   { emoji: '📝', label: 'Prev. Papers', color: 'text-purple-600 bg-purple-50' },
  book:  { emoji: '📚', label: 'Book',         color: 'text-blue-600  bg-blue-50' },
  video: { emoji: '🎬', label: 'Video Notes',  color: 'text-orange-600 bg-orange-50' },
}

export default function StudyMaterialsAdminPage() {
  const [status,    setStatus]    = useState('pending')
  const [materials, setMaterials] = useState<any[]>([])
  const [stats,     setStats]     = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing,   setProcessing]   = useState<string | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const loadStats = useCallback(async () => {
    try {
      const res = await api.studyMaterials.adminStats()
      setStats(res.data)
    } catch {}
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.studyMaterials.adminList({ status, limit: 50 })
      setMaterials(res.data?.materials ?? [])
    } catch (e: any) { flash('❌ ' + e.message) }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { load(); loadStats() }, [load, loadStats])

  const approve = async (id: string) => {
    setProcessing(id)
    try { await api.studyMaterials.approve(id); flash('✅ Approved & published'); load() }
    catch (e: any) { flash('❌ ' + e.message) }
    finally { setProcessing(null) }
  }

  const reject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return
    setProcessing(rejectTarget.id)
    try {
      await api.studyMaterials.reject(rejectTarget.id, rejectReason)
      flash('Material rejected'); setRejectTarget(null); setRejectReason(''); load()
    } catch (e: any) { flash('❌ ' + e.message) }
    finally { setProcessing(null) }
  }

  const toggleFeature = async (id: string) => {
    try { await api.studyMaterials.toggleFeatured(id); flash('✅ Updated'); load() } catch {}
  }
  const toggleTrending = async (id: string) => {
    try { await api.studyMaterials.toggleTrending(id); flash('✅ Updated'); load() } catch {}
  }
  const deleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try { await api.studyMaterials.delete(id); flash('✅ Deleted'); load() } catch {}
  }
  const preview = async (id: string) => {
    try {
      const res = await api.studyMaterials.signedUrl(id)
      const url = res.data?.url ?? null
      if (!url) { flash('❌ No file URL available'); return }
      setPreviewUrl(url)
    } catch { flash('❌ Preview unavailable') }
  }

  const openInNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer')
  }

  const fmt = (bytes: number) => {
    if (!bytes) return '—'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen">
      <Header title="Study Materials" subtitle="Review uploads and manage content library" />
      <div className="p-6 space-y-5">
        {msg && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>{msg}</div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { emoji: '⏳', label: 'Pending',    value: stats.pending,        color: 'text-amber-600' },
              { emoji: '✅', label: 'Approved',   value: stats.approved,       color: 'text-green-600' },
              { emoji: '❌', label: 'Rejected',   value: stats.rejected,       color: 'text-red-600'   },
              { emoji: '📌', label: 'Featured',   value: stats.featured,       color: 'text-blue-600'  },
              { emoji: '⬇️', label: 'Downloads',  value: stats.totalDownloads, color: 'text-slate-600' },
              { emoji: '👥', label: 'Contributors',value: stats.contributors,  color: 'text-slate-600' },
            ].map(s => (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{(s.value ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {STATUS_TABS.map(t => (
            <button key={t.key}
              onClick={() => setStatus(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                status === t.key ? t.color : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}>
              {t.label}
            </button>
          ))}
          <button onClick={load} className="ml-auto btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-12 text-center text-slate-400">Loading…</div>
        ) : materials.length === 0 ? (
          <div className="card p-16 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-semibold text-slate-800">No {status} materials</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m: any) => {
              const meta = TYPE_META[m.materialType] ?? TYPE_META['pdf']
              return (
                <div key={m.id} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${meta.color}`}>
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-900 truncate">{m.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                        {m.isFeatured && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-blue-700 bg-blue-50">📌 Featured</span>}
                        {m.isTrending && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-orange-700 bg-orange-50">🔥 Trending</span>}
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                        <span>📁 {m.subject}</span>
                        <span>👤 {m.uploaderName ?? '—'}</span>
                        <span>💾 {fmt(m.fileSizeBytes)}</span>
                        <span>⬇️ {m.downloadCount ?? 0}</span>
                        <span>📅 {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}</span>
                      </div>
                      {m.status === 'rejected' && m.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">Reason: {m.rejectionReason}</p>
                      )}
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button onClick={() => preview(m.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Preview">
                        <Eye size={16} />
                      </button>
                      {m.status === 'approved' && (
                        <>
                          <button onClick={() => toggleFeature(m.id)}
                            className={`p-2 rounded-lg ${m.isFeatured ? 'text-blue-600 bg-blue-50' : 'hover:bg-slate-100 text-slate-500'}`} title="Toggle Featured">
                            <Pin size={16} />
                          </button>
                          <button onClick={() => toggleTrending(m.id)}
                            className={`p-2 rounded-lg ${m.isTrending ? 'text-orange-600 bg-orange-50' : 'hover:bg-slate-100 text-slate-500'}`} title="Toggle Trending">
                            <TrendingUp size={16} />
                          </button>
                        </>
                      )}
                      {m.status === 'pending' && (
                        <>
                          <button onClick={() => approve(m.id)} disabled={processing === m.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                            <CheckCircle size={14} />
                            {processing === m.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button onClick={() => setRejectTarget(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100">
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteMaterial(m.id, m.title)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Reject Material</p>
              <button onClick={() => setRejectTarget(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-600">"{rejectTarget.title}"</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for rejection *</label>
              <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Duplicate content, low quality, incorrect subject…"
                className="input w-full" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600">Cancel</button>
              <button onClick={reject} disabled={!rejectReason.trim() || processing === rejectTarget.id}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {processing === rejectTarget.id ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal — uses Google Docs viewer for PDF rendering */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">File Preview</p>
              <div className="flex items-center gap-2">
                <button onClick={openInNewTab}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700">
                  ↗ Open in new tab
                </button>
                <button onClick={() => setPreviewUrl(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* Google Docs viewer renders PDFs reliably without nginx /uploads/ config */}
            {previewUrl.match(/\.(pdf)$/i) ? (

<iframe
  src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
  className="flex-1 w-full"
  title="Material Preview"
/>

) : previewUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (

<div className="flex-1 bg-black flex items-center justify-center p-4 overflow-auto">
  <img
    src={previewUrl}
    alt="Preview"
    className="max-w-full max-h-full object-contain rounded-lg"
  />
</div>

) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="text-6xl">📄</span>
                <p className="text-slate-700 font-semibold">Preview not available for this file type</p>
                <p className="text-sm text-slate-500">Click the button above to open the file directly</p>
                <button onClick={openInNewTab}
                  className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600">
                  Open File ↗
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}