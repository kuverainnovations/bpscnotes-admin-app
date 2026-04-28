'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { getStatusColor, formatNumber, formatCurrency } from '@/lib/utils'
import { Search, Download, RefreshCw, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const PLAN_COLORS: Record<string, string> = {
  monthly:   'bg-blue-100 text-blue-700 border-blue-200',
  quarterly: 'bg-purple-100 text-purple-700 border-purple-200',
  annual:    'bg-yellow-100 text-yellow-700 border-yellow-200',
}
const PIE_COLORS = ['#1565C0', '#9B59B6', '#F39C12']

export default function SubscriptionsPage() {
  const [search, setSearch]   = useState('')
  const [planFilter, setPlan] = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]       = useState(1)
  const { showToast, ToastComponent } = useToast()

  const { data, meta: pageMeta, loading, error, refetch } = useApiData<any>(
    () => api.subscriptions.list({ search, plan: planFilter, status: statusFilter, page, limit: 20 }),
    [search, planFilter, statusFilter, page]
  )
  const subs: any[]    = data?.subscriptions || []

  const { data: statsData } = useApiData<any>(() => api.dashboard.getStats(), [])
  const stats = statsData

  const { data: revData } = useApiData<any>(
    () => api.dashboard.getChart('revenue'), []
  )
  const revChart: any[] = revData?.data || []

  const { data: pieData } = useApiData<any>(
    () => api.dashboard.getRevenueBreakdown(), []
  )
  const revPie: any[] = pieData?.data || []

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Subscriptions & Payments" subtitle="Manage all subscriptions and revenue" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Subscriptions', value: formatNumber(stats?.activeSubscriptions || 0), emoji: '✅' },
            { label: 'Revenue (Month)',       value: `₹${formatNumber(stats?.revenueThisMonth || 0)}`, emoji: '💰' },
            { label: 'Total Revenue',         value: `₹${formatNumber(stats?.totalRevenue || 0)}`, emoji: '📈' },
            { label: 'Growth %',              value: `${stats?.revenueGrowthPct >= 0 ? '+' : ''}${stats?.revenueGrowthPct || 0}%`, emoji: '🚀' },
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-2">
            <h2 className="section-title">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: number) => [`₹${formatNumber(v)}`, 'Revenue']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" fill="#1565C0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h2 className="section-title">Plan Distribution</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={revPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                  {revPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % 3]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {revPie.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % 3] }} />
                    <span className="text-xs text-slate-600 capitalize">{r.plan}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{r.count} users</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name or email..." className="input pl-9" />
          </div>
          <select value={planFilter} onChange={e => { setPlan(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Plans</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input w-auto">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <div className="card"><ErrorMessage message={error} onRetry={refetch} /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['User', 'Plan', 'Amount', 'Period', 'Payment', 'Coins Used', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(sub => (
                  <tr key={sub.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {sub.user_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{sub.user_name}</p>
                          <p className="text-xs text-slate-400">{sub.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${PLAN_COLORS[sub.plan] || ''}`}>{sub.plan}</span></td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">₹{sub.final_amount}</p>
                      {sub.coupon_discount > 0 && <p className="text-xs text-green-600">-₹{sub.coupon_discount} coupon</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">{sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : '—'}</p>
                      <p className="text-xs text-slate-400">→ {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CreditCard size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">{sub.payment_method || '—'}</span>
                      </div>
                      {sub.upi_id && <p className="text-xs text-slate-400">{sub.upi_id}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {sub.coins_used > 0
                        ? <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200">🪙 {sub.coins_used}</span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${getStatusColor(sub.status)}`}>{sub.status}</span></td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400">No subscriptions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pageMeta?.total > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pageMeta?.total)} of {formatNumber(pageMeta?.total)}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary disabled:opacity-50">← Prev</button>
              <button disabled={page * 20 >= pageMeta?.total} onClick={() => setPage(p => p + 1)} className="btn-secondary disabled:opacity-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
