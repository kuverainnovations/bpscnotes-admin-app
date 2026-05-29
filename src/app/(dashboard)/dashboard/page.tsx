'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, RefreshCw, Users, DollarSign,
  Crown, Target, Coins, Activity, BookOpen, FileText,
  HelpCircle, Newspaper, Briefcase, ArrowRight, Plus,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const PIE_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#F39C12']

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, growth, gradient }:
  { icon: React.ReactNode; label: string; value: string; sub: string; growth?: number; gradient: string }) {
  const isPositive = !growth || growth >= 0
  return (
    <div className={`card p-5 overflow-hidden relative bg-gradient-to-br ${gradient}`}>
      {/* bg decoration */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
            {icon}
          </div>
          {growth !== undefined && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
              ${isPositive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'}`}>
              {isPositive ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
              {Math.abs(growth)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-white/80 text-xs font-semibold mt-0.5">{label}</p>
        <p className="text-white/50 text-[10px] mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]         = useState<any>(null)
  const [userChart, setUserChart] = useState<any[]>([])
  const [revChart, setRevChart]   = useState<any[]>([])
  const [revPie, setRevPie]       = useState<any[]>([])
  const [examDist, setExamDist]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const { admin } = useAuth()

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [s, uc, rc, rp, ed] = await Promise.allSettled([
        api.dashboard.getStats(),
        api.dashboard.getChart('users'),
        api.dashboard.getChart('revenue'),
        api.dashboard.getRevenueBreakdown(),
        api.dashboard.getExamDistribution(),
      ])
      if (s.status  === 'fulfilled') setStats(s.value.data)
      if (uc.status === 'fulfilled') setUserChart(uc.value.data?.data || [])
      if (rc.status === 'fulfilled') setRevChart(rc.value.data?.data || [])
      if (rp.status === 'fulfilled') setRevPie(rp.value.data?.data || [])
      if (ed.status === 'fulfilled') setExamDist(ed.value.data?.data || [])
      if (s.status  === 'rejected')  setError((s.reason as Error)?.message ?? 'Failed to load')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (!admin) return; load() }, [admin])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Loading dashboard…</p>
      </div>
    </div>
  )

  if (error && !stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-red-500 font-bold mb-2">{error}</p>
        <p className="text-slate-400 text-sm mb-5">Unable to connect to the server.</p>
        <button onClick={load} className="btn-primary"><RefreshCw size={14}/> Retry</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${admin?.name?.split(' ')[0] ?? 'Admin'} 👋`}
        subtitle="Here's what's happening with BPSCNotes today."
      />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Primary stat cards ───────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users size={18}/>}       label="Total Users"      value={formatNumber(stats?.totalUsers||0)}            sub={`+${formatNumber(stats?.newThisWeek||0)} this week`}             growth={stats?.newThisWeek > 0 ? 5 : 0} gradient="from-blue-600 to-blue-700" />
          <StatCard icon={<DollarSign size={18}/>}  label="Revenue (Month)"  value={`₹${formatNumber(stats?.revenueThisMonth||0)}`} sub={`vs ₹${formatNumber(stats?.revenueLastMonth||0)} last month`}  growth={stats?.revenueGrowthPct} gradient="from-emerald-500 to-emerald-700" />
          <StatCard icon={<Crown size={18}/>}       label="Active Subs"      value={formatNumber(stats?.activeSubscriptions||0)}    sub="Currently active"                                               gradient="from-purple-600 to-purple-700" />
          <StatCard icon={<Target size={18}/>}      label="Avg Accuracy"     value={`${parseFloat(stats?.avgAccuracy||0).toFixed(1)}%`}  sub="Quiz performance"                                          gradient="from-orange-500 to-orange-600" />
          <StatCard icon={<Activity size={18}/>}    label="Active Today"     value={formatNumber(stats?.activeToday||0)}            sub="Users active today"                                             gradient="from-red-500 to-red-600" />
          <StatCard icon={<span className="text-lg">🪙</span>} label="Coins" value={formatNumber(stats?.coinCirculation||0)}       sub="Total coins earned"                                             gradient="from-amber-500 to-amber-600" />
        </div>

        {/* ── Charts row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* User Growth */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">User Growth</h2>
                <p className="text-xs text-slate-400 mt-0.5">New registrations over last 12 months</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-xl">
                <TrendingUp size={11}/> +{stats?.newThisMonth || 0} this month
              </span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={userChart} margin={{top:5, right:5, bottom:0, left:-10}}>
                <defs>
                  <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1565C0" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v)} />
                <Tooltip formatter={(v:number)=>[formatNumber(v),'Users']} contentStyle={{borderRadius:12,fontSize:12,border:'1px solid #e2e8f0'}} />
                <Area type="monotone" dataKey="value" stroke="#1565C0" strokeWidth={2.5} fill="url(#ug)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue split */}
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="font-bold text-slate-900">Revenue Split</h2>
              <p className="text-xs text-slate-400 mt-0.5">By subscription plan</p>
            </div>
            {revPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={revPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="amount">
                      {revPie.map((_:any, i:number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v:number)=>[`₹${formatNumber(v)}`,'Revenue']} contentStyle={{borderRadius:12,fontSize:12}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {revPie.map((r:any, i:number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                        <span className="text-xs text-slate-600 capitalize">{r.plan}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">₹{formatNumber(r.amount)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({r.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-300 text-sm">No data yet</div>
            )}
          </div>
        </div>

        {/* ── Second row ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Monthly Revenue */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">Monthly Revenue</h2>
                <p className="text-xs text-slate-400 mt-0.5">₹ earned per month</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revChart} margin={{top:5, right:5, bottom:0, left:-10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`} />
                <Tooltip formatter={(v:number)=>[`₹${formatNumber(v)}`,'Revenue']} contentStyle={{borderRadius:12,fontSize:12}} />
                <Bar dataKey="value" fill="#1565C0" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Exam distribution */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">Exam Distribution</h2>
                <p className="text-xs text-slate-400 mt-0.5">Which exams users are preparing for</p>
              </div>
            </div>
            <div className="space-y-3">
              {examDist.slice(0, 6).map((e:any, i:number) => {
                const total = examDist.reduce((a:number,x:any) => a + parseInt(x.users||0), 0) || 1
                const pct   = Math.round(parseInt(e.users||0) / total * 100)
                return (
                  <div key={e.exam} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4 font-bold shrink-0">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 truncate">{e.exam}</span>
                        <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">{formatNumber(e.users)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length]}}/>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right shrink-0">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Content counters ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label:'Courses',    value:stats?.totalCourses||0, icon:<BookOpen size={18}/>,    gradient:'from-blue-500 to-blue-600' },
            { label:'Notes',      value:stats?.totalNotes||0,   icon:<FileText size={18}/>,    gradient:'from-teal-500 to-teal-600' },
            { label:'Quizzes',    value:stats?.totalQuizzes||0, icon:<HelpCircle size={18}/>,  gradient:'from-purple-500 to-purple-600' },
            { label:'Affairs',    value:stats?.totalAffairs||0, icon:<Newspaper size={18}/>,   gradient:'from-orange-500 to-orange-600' },
            { label:'Active Jobs',value:stats?.activeJobs||0,   icon:<Briefcase size={18}/>,   gradient:'from-green-500 to-green-600' },
          ].map(s => (
            <div key={s.label} className={`card p-4 bg-gradient-to-br ${s.gradient} relative overflow-hidden`}>
              <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">{s.icon}</div>
                <div>
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-white/70 text-xs font-medium">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Quick Actions</h2>
            <p className="text-xs text-slate-400">Jump to common tasks</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'Add Current Affairs', href:'/current-affairs', icon:<Newspaper size={18}/>,  bg:'bg-blue-50',   text:'text-blue-700',   hover:'hover:bg-blue-100' },
              { label:'Create Quiz',         href:'/quizzes',         icon:<HelpCircle size={18}/>, bg:'bg-purple-50', text:'text-purple-700', hover:'hover:bg-purple-100' },
              { label:'Upload Notes',        href:'/content/notes',   icon:<FileText size={18}/>,   bg:'bg-green-50',  text:'text-green-700',  hover:'hover:bg-green-100' },
              { label:'Send Notification',   href:'/notifications',   icon:<Activity size={18}/>,   bg:'bg-orange-50', text:'text-orange-700', hover:'hover:bg-orange-100' },
            ].map(a => (
              <a key={a.label} href={a.href}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${a.bg} ${a.hover} group`}>
                <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm ${a.text} shrink-0`}>
                  {a.icon}
                </div>
                <span className={`text-sm font-semibold ${a.text} flex-1 leading-tight`}>{a.label}</span>
                <ArrowRight size={14} className={`${a.text} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}