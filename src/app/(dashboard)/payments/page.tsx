'use client'
import { useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useDebounce } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import { Search, Download, RefreshCw, CreditCard, TrendingUp, BookOpen, FileText, Users } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatCurrency(n: number) { return `₹${(n || 0).toLocaleString('en-IN')}` }
function formatDate(s: string) { return s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    success:   'bg-emerald-100 text-emerald-700',
    pending:   'bg-yellow-100 text-yellow-700',
    failed:    'bg-red-100 text-red-700',
    refunded:  'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status || '—'}
    </span>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-semibold opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Filters bar
// ─────────────────────────────────────────────────────────────
function FiltersBar({
  search, onSearch,
  status, onStatus,
  dateFrom, onDateFrom,
  dateTo, onDateTo,
  onExport,
}: {
  search: string; onSearch: (v: string) => void
  status: string; onStatus: (v: string) => void
  dateFrom: string; onDateFrom: (v: string) => void
  dateTo: string; onDateTo: (v: string) => void
  onExport: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Search user, item…"
          className="input pl-9 w-full text-sm"
        />
      </div>
      <select value={status} onChange={e => onStatus(e.target.value)} className="input text-sm w-36">
        <option value="">All Status</option>
        <option value="completed">Completed</option>
        <option value="success">Success</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
        <option value="refunded">Refunded</option>
      </select>
      <input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} className="input text-sm" title="From date" />
      <input type="date" value={dateTo}   onChange={e => onDateTo(e.target.value)}   className="input text-sm" title="To date" />
      <button onClick={onExport} className="btn-secondary flex items-center gap-1.5 text-sm">
        <Download className="w-4 h-4" /> Export CSV
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────
function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-2 justify-end mt-4 text-sm">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">← Prev</button>
      <span className="text-slate-500">Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">Next →</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Course Purchases Tab
// ─────────────────────────────────────────────────────────────
function CoursePurchasesTab() {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [page, setPage]         = useState(1)
  const dSearch = useDebounce(search, 400)

  const params = { search: dSearch, status, dateFrom, dateTo, page, limit: 20 }
  const { data, loading, error, refetch } = useApiData(
    () => api.payments.getCoursePurchases(params),
    [dSearch, status, dateFrom, dateTo, page]
  )

  const purchases = data?.purchases ?? []
  const meta      = data?.meta ?? { total: 0 }

  return (
    <div className="space-y-4">
      <FiltersBar
        search={search} onSearch={v => { setSearch(v); setPage(1) }}
        status={status} onStatus={v => { setStatus(v); setPage(1) }}
        dateFrom={dateFrom} onDateFrom={setDateFrom}
        dateTo={dateTo}     onDateTo={setDateTo}
        onExport={() => api.payments.exportCsv('courses')}
      />
      {loading && <PageLoader />}
      {error   && <ErrorMessage message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400">{meta.total} transaction{meta.total !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {['Date','User','Course','Amount','Status','Order ID','Provider'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No records found</td></tr>
                )}
                {purchases.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.user_name}</div>
                      <div className="text-xs text-slate-400">{p.user_mobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 max-w-[200px] truncate">{p.course_title}</div>
                      <div className="text-xs text-slate-400">Listed ₹{p.course_price}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.provider_order_id || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{p.payment_provider || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={meta.total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Material Purchases Tab
// ─────────────────────────────────────────────────────────────
function MaterialPurchasesTab() {
  const [search, setSearch]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [page, setPage]         = useState(1)
  const dSearch = useDebounce(search, 400)

  const params = { search: dSearch, dateFrom, dateTo, page, limit: 20 }
  const { data, loading, error, refetch } = useApiData(
    () => api.payments.getMaterialPurchases(params),
    [dSearch, dateFrom, dateTo, page]
  )

  const purchases = data?.purchases ?? []
  const meta      = data?.meta     ?? { total: 0 }
  const totals    = data?.totals

  return (
    <div className="space-y-4">
      <FiltersBar
        search={search} onSearch={v => { setSearch(v); setPage(1) }}
        status="" onStatus={() => {}}
        dateFrom={dateFrom} onDateFrom={setDateFrom}
        dateTo={dateTo}     onDateTo={setDateTo}
        onExport={() => api.payments.exportCsv('materials')}
      />
      {totals && (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total Collected" value={formatCurrency(totals.total_collected)} color="bg-blue-50 border-blue-200 text-blue-800" />
          <MetricCard label="Platform Revenue (40%)" value={formatCurrency(totals.total_platform_fee)} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
        </div>
      )}
      {loading && <PageLoader />}
      {error   && <ErrorMessage message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400">{meta.total} transaction{meta.total !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {['Date','User','Material','Amount Paid','Platform Fee','Order ID','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No records found</td></tr>
                )}
                {purchases.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.user_name}</div>
                      <div className="text-xs text-slate-400">{p.user_mobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 max-w-[200px] truncate">{p.material_title}</div>
                      <div className="text-xs text-slate-400">Listed ₹{p.material_price}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(p.price_paid)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(p.platform_fee)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.provider_order_id || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.order_status || 'completed'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={meta.total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subscriptions Tab
// ─────────────────────────────────────────────────────────────
function SubscriptionsTab() {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [page, setPage]         = useState(1)
  const dSearch = useDebounce(search, 400)

  const params = { search: dSearch, status, dateFrom, dateTo, page, limit: 20 }
  const { data, loading, error, refetch } = useApiData(
    () => api.payments.getSubscriptionPayments(params),
    [dSearch, status, dateFrom, dateTo, page]
  )

  const payments = data?.payments ?? []
  const meta     = data?.meta    ?? { total: 0 }

  return (
    <div className="space-y-4">
      <FiltersBar
        search={search} onSearch={v => { setSearch(v); setPage(1) }}
        status={status} onStatus={v => { setStatus(v); setPage(1) }}
        dateFrom={dateFrom} onDateFrom={setDateFrom}
        dateTo={dateTo}     onDateTo={setDateTo}
        onExport={() => api.payments.exportCsv('subscriptions')}
      />
      {loading && <PageLoader />}
      {error   && <ErrorMessage message={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400">{meta.total} transaction{meta.total !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  {['Date','User','Plan','Amount','Status','Order ID','Payment ID','Provider'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No records found</td></tr>
                )}
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.user_name}</div>
                      <div className="text-xs text-slate-400">{p.user_mobile}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{p.plan || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(p.final_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.payment_status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.provider_order_id   || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.provider_payment_id || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{p.payment_provider || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={meta.total} limit={20} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data, loading, error, refetch } = useApiData(
    () => api.payments.getDashboard(), []
  )
  const d = data ?? {}

  if (loading) return <PageLoader />
  if (error)   return <ErrorMessage message={error} onRetry={refetch} />

  return (
    <div className="space-y-6">
      {/* Revenue metrics */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Total Revenue"         value={formatCurrency(d.totalRevenue)}         color="bg-blue-50 border-blue-200 text-blue-900" />
          <MetricCard label="Revenue Today"         value={formatCurrency(d.revenueToday)}         color="bg-emerald-50 border-emerald-200 text-emerald-900" />
          <MetricCard label="Revenue This Month"    value={formatCurrency(d.revenueThisMonth)}     color="bg-violet-50 border-violet-200 text-violet-900" />
          <MetricCard label="Course Revenue"        value={formatCurrency(d.courseRevenue)}         color="bg-amber-50 border-amber-200 text-amber-900"
            sub="Individual course purchases" />
          <MetricCard label="Study Material Revenue" value={formatCurrency(d.studyMaterialRevenue)} color="bg-sky-50 border-sky-200 text-sky-900"
            sub="Platform share (40%)" />
          <MetricCard label="Subscription Revenue"  value={formatCurrency(d.subscriptionRevenue)}  color="bg-indigo-50 border-indigo-200 text-indigo-900" />
        </div>
      </section>

      {/* Transaction counts */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Transactions</h2>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Successful Payments" value={String(d.successfulPayments ?? 0)} color="bg-emerald-50 border-emerald-200 text-emerald-900" />
          <MetricCard label="Failed Payments"     value={String(d.failedPayments    ?? 0)} color="bg-red-50 border-red-200 text-red-900" />
          <MetricCard label="Refunds"             value={String(d.refunds           ?? 0)} color="bg-purple-50 border-purple-200 text-purple-900" />
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: 'Course Purchases',   icon: BookOpen,  tab: 'courses' },
          { label: 'Study Materials',    icon: FileText,  tab: 'materials' },
          { label: 'Subscriptions',      icon: CreditCard, tab: 'subscriptions' },
        ].map(({ label, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-3">
            <Icon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',     label: '📊 Dashboard'          },
  { id: 'courses',       label: '🎓 Course Purchases'    },
  { id: 'materials',     label: '📄 Material Purchases'  },
  { id: 'subscriptions', label: '💳 Subscriptions'       },
]

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="space-y-6">
      <Header
        title="Payment Management"
        subtitle="Track all transactions — courses, study materials, and subscriptions"
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'dashboard'     && <DashboardTab />}
        {activeTab === 'courses'       && <CoursePurchasesTab />}
        {activeTab === 'materials'     && <MaterialPurchasesTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
      </div>
    </div>
  )
}
