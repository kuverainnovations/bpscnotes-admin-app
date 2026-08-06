'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData } from '@/lib/hooks'
import { useToast } from '@/components/ui/feedback'
import { RefreshCw, Flag, EyeOff, Eye, Ban, Check, AlertTriangle } from 'lucide-react'

// ════════════════════════════════════════════════════════════
// Content Reports — the moderation half of Play's UGC policy.
//
// Shipping report buttons in the app is only half of what the policy asks
// for; the reports have to be reviewed and acted on. This queue is that
// evidence, and it is also what a reviewer is told to look at if they ask
// how reports are handled.
// ════════════════════════════════════════════════════════════

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'actioned',  label: 'Actioned',  color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'dismissed', label: 'Dismissed', color: 'text-slate-600 bg-slate-100 border-slate-300' },
  { key: 'all',       label: 'All',       color: 'text-slate-700 bg-slate-100 border-slate-300' },
]

const REASON_LABELS: Record<string, string> = {
  spam:           '📢 Spam or advertising',
  harassment:     '😠 Harassment or bullying',
  hate_speech:    '🚫 Hate speech',
  sexual_content: '🔞 Sexual content',
  violence:       '⚠️ Violence or threats',
  copyright:      '©️ Copyright infringement',
  misinformation: '❌ False information',
  personal_info:  '🔒 Shares personal info',
  other:          '❓ Something else',
}

const TYPE_LABELS: Record<string, string> = {
  room_message:   'Room chat message',
  peer_review:    'Peer review',
  answer:         'Written answer',
  study_material: 'Marketplace upload',
  user:           'User profile',
}

export default function ModerationPage() {
  const { showToast, ToastComponent } = useToast()
  const [status, setStatus] = useState('pending')
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data, loading, refetch } = useApiData<any>(
    () => api.moderation.list({ status, limit: 200 }),
    [status]
  )

  const reports: any[] = data?.reports ?? []
  const counts = data?.counts ?? {}

  const act = async (id: string, action: string) => {
    // 'ban' suspends a real person's account — the one action here that is
    // not trivially undoable from this screen, so it asks first.
    if (action === 'ban' && !confirm('Suspend this user? They will be signed out and unable to log in.')) return
    setBusyId(id)
    try {
      await api.moderation.act(id, action)
      showToast(
        action === 'dismiss' ? 'Report dismissed'
          : action === 'ban' ? 'User suspended'
          : action === 'hide' ? 'Content hidden'
          : 'Content restored'
      )
      refetch()
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Header title="Content Reports" subtitle="User-reported content awaiting review" />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                status === t.key ? t.color : 'text-slate-500 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {t.key === 'pending' && counts.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-xs">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={refetch}
            className="ml-auto p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && reports.length === 0 && (
          <div className="py-16 text-center text-slate-400">Loading reports…</div>
        )}

        {!loading && reports.length === 0 && (
          <div className="py-16 text-center">
            <Flag className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nothing to review</p>
            <p className="text-slate-400 text-sm">Reports from the app appear here.</p>
          </div>
        )}

        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                  {TYPE_LABELS[r.content_type] ?? r.content_type}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium">
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                {Number(r.reports_against_user) > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {r.reports_against_user} reports against this user
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                </span>
              </div>

              {r.content_preview && (
                <blockquote className="text-sm text-slate-700 bg-slate-50 border-l-2 border-slate-300 px-3 py-2 rounded-r whitespace-pre-wrap break-words">
                  {r.content_preview}
                </blockquote>
              )}

              {r.details && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-500">Reporter said: </span>
                  {r.details}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Reported by <b className="text-slate-700">{r.reporter_name ?? 'Unknown'}</b></span>
                <span>
                  Author <b className="text-slate-700">{r.reported_user_name ?? 'Unknown'}</b>
                  {r.reported_user_status === 'banned' && (
                    <span className="ml-1 text-red-600 font-semibold">(suspended)</span>
                  )}
                </span>
              </div>

              {r.status === 'pending' ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'hide')}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Hide content
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'ban')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> Suspend user
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'dismiss')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">
                    {r.status === 'dismissed' ? 'Dismissed' : `Actioned — ${r.action_taken}`}
                    {r.reviewed_at ? ` on ${new Date(r.reviewed_at).toLocaleDateString()}` : ''}
                  </span>
                  {r.action_taken === 'hide' && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, 'unhide')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Restore content
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {ToastComponent}
    </>
  )
}
