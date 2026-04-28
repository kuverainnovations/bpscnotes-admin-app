'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Trophy, RefreshCw, RotateCcw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function LeaderboardPage() {
  const [recalculating, setRecalculating] = useState(false)
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.leaderboard.list(), []
  )
  const ranked: any[] = data?.leaderboard || []

  const { mutate: recalculate } = useMutation(
    () => api.leaderboard.recalculate(),
    {
      onSuccess: () => { refetch(); showToast('Leaderboard recalculated ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const medals = ['🥇', '🥈', '🥉']
  const COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#E67E22', '#E74C3C', '#1ABC9C', '#F39C12', '#3498DB']

  const top3 = [ranked[1], ranked[0], ranked[2]]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Leaderboard" subtitle="View and manage student rankings" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="flex justify-end gap-2">
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => recalculate()} disabled={recalculating} className="btn-secondary">
            <RotateCcw size={14} />{recalculating ? 'Recalculating...' : 'Recalculate Ranks'}
          </button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : (
          <>
            {/* Podium */}
            {ranked.length >= 3 && (
              <div className="card p-6">
                <h2 className="section-title">🏆 Top 3</h2>
                <div className="flex items-end justify-center gap-4 h-40">
                  {top3.map((user, i) => {
                    if (!user) return null
                    const heights = ['h-28', 'h-36', 'h-24']
                    const positions = ['2nd', '1st', '3rd']
                    const colors = ['bg-slate-300', 'bg-yellow-400', 'bg-orange-300']
                    return (
                      <div key={user.id} className={`flex flex-col items-center gap-2 ${heights[i]} justify-end`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: COLORS[i % COLORS.length] }}>
                          {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <p className="text-xs font-bold text-slate-700">{user.name?.split(' ')[0]}</p>
                        <div className={`w-20 rounded-t-xl flex items-center justify-center py-2 ${colors[i]}`}>
                          <span className="text-white font-black text-sm">{positions[i]}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full table */}
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Rank', 'Student', 'Exam', 'Streak', 'Accuracy', 'Study Hours', 'Coins', 'Plan'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((user, i) => (
                    <tr key={user.id} className="table-row">
                      <td className="px-4 py-3">
                        {i < 3
                          ? <span className="text-xl">{medals[i]}</span>
                          : <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 inline-flex">#{user.rank || i + 1}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: COLORS[i % COLORS.length] }}>
                            {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">{user.primary_exam || '—'}</td>
                      <td className="px-4 py-3"><span className="badge bg-red-50 text-red-600 border-red-100">🔥 {user.streak}d</span></td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{parseFloat(user.accuracy || 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-700">{Math.round((user.total_study_minutes || 0) / 60)}h</td>
                      <td className="px-4 py-3"><span className="badge bg-yellow-100 text-yellow-700 border-yellow-200">🪙 {formatNumber(user.coins)}</span></td>
                      <td className="px-4 py-3">
                        <span className={`badge ${user.subscription ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {user.subscription || 'free'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ranked.length === 0 && (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-400">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
