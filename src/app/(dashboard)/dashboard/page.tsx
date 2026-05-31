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
  TrendingUp, TrendingDown, RefreshCw, Users, IndianRupee,
  Crown, Target, Activity, BookOpen, FileText,
  HelpCircle, Newspaper, Briefcase, ArrowRight,
  Zap, BarChart2, BookMarked, Award,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

const CHART_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#F39C12', '#E74C3C', '#1ABC9C']

// ── Stat card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend, color, iconBg, iconText }:
  { icon: React.ReactNode; label: string; value: string; sub?: string
    trend?: number; color: string; iconBg: string; iconText: string }) {
  const up = !trend || trend >= 0
  return (
    <div className="card p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <span className={iconText}>{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
            ${up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {up ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-xs font-semibold text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Content stat mini card ────────────────────────────────────
function ContentCard({ icon, label, value, href, color }:
  { icon: React.ReactNode; label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href}
      className={`card p-4 flex items-center gap-3 hover:shadow-md transition-all group ${color}`}>
      <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-black text-slate-900">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-slate-600 truncate">{label}</p>
      </div>
      <ArrowRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
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

  const hr   = new Date().getHours()
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'

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
      if (uc.status === 'fulfilled') setUserChart((uc.value.data?.data || []).map((d:any)=>({...d, value: Number(d.value)||0})))
      if (rc.status === 'fulfilled') setRevChart(rc.value.data?.data || [])
      if (rp.status === 'fulfilled') setRevPie(rp.value.data?.data || [])
      if (ed.status === 'fulfilled') setExamDist(ed.value.data?.data || [])
      if (s.status  === 'rejected')  setError((s.reason as Error)?.message ?? 'Failed to load')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (!admin) return; load() }, [admin])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
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
        <p className="text-slate-400 text-sm mb-5">Unable to connect to the server</p>
        <button onClick={load} className="btn-primary"><RefreshCw size={14}/> Retry</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header
        title={`${greeting}, ${admin?.name?.split(' ')[0] ?? 'Admin'} 👋`}
        subtitle="Here's BPSCNotes at a glance today"
      />

      <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">

        {/* ── Hero welcome strip ──────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">Overview · Today</p>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {formatNumber(stats?.totalUsers || 0)} learners
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {formatNumber(stats?.activeToday || 0)} active today ·
                +{formatNumber(stats?.newThisWeek || 0)} this week
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Active Subs',  value: stats?.activeSubscriptions || 0, icon: '👑' },
                { label: 'Study Rooms', value: stats?.activeStudyRooms || 4,    icon: '🏫' },
                { label: 'Quiz Attempts',value: stats?.quizAttempts || 0,       icon: '📝' },
              ].map(s => (
                <div key={s.label} className="bg-white/15 rounded-2xl px-4 py-3 text-center min-w-[90px]">
                  <p className="text-lg font-black text-white">{formatNumber(s.value)}</p>
                  <p className="text-white/60 text-[10px] font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
              <button onClick={load}
                className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Refresh">
                <RefreshCw size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── Primary stat cards ──────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { icon:<Users size={16}/>,    label:'Total Users',   value:formatNumber(stats?.totalUsers||0),               sub:`+${formatNumber(stats?.newThisMonth||0)} this month`, trend:5,                        iconBg:'bg-blue-100',    iconText:'text-blue-600',   color:'' },
            { icon:<IndianRupee size={16}/>,label:'Revenue/Month', value:`₹${formatNumber(stats?.revenueThisMonth||0)}`, sub:`Last: ₹${formatNumber(stats?.revenueLastMonth||0)}`,  trend:stats?.revenueGrowthPct, iconBg:'bg-emerald-100', iconText:'text-emerald-600',color:'' },
            { icon:<Crown size={16}/>,    label:'Active Subs',   value:formatNumber(stats?.activeSubscriptions||0),      sub:'Currently active',                                                                   iconBg:'bg-purple-100',  iconText:'text-purple-600', color:'' },
            { icon:<Target size={16}/>,   label:'Avg Accuracy',  value:`${parseFloat(stats?.avgAccuracy||0).toFixed(1)}%`, sub:'Quiz performance',                                                                iconBg:'bg-orange-100',  iconText:'text-orange-600', color:'' },
            { icon:<Activity size={16}/>, label:'Active Today',  value:formatNumber(stats?.activeToday||0),              sub:'Unique users',                                                                        iconBg:'bg-red-100',     iconText:'text-red-600',    color:'' },
            { icon:<span>🪙</span>,       label:'Coins',         value:formatNumber(stats?.coinCirculation||0),           sub:'Total earned',                                                                        iconBg:'bg-amber-100',   iconText:'text-amber-600',  color:'' },
          ].map(s => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Charts ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* User growth area chart */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-900">User Growth</h2>
                <p className="text-xs text-slate-400 mt-0.5">New registrations — last 12 months</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1.5 rounded-xl border border-green-100">
                <TrendingUp size={11}/> +{formatNumber(stats?.newThisMonth || 0)} this month
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userChart} margin={{top:5, right:5, bottom:0, left:-15}}>
                <defs>
                  <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1565C0" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v)} domain={[0,'auto']} allowDataOverflow={false}/>
                <Tooltip
                  formatter={(v:number) => [formatNumber(v), 'Users']}
                  contentStyle={{borderRadius:12, fontSize:12, border:'1px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,.06)'}}
                />
                <Area type="monotone" dataKey="value" stroke="#1565C0" strokeWidth={2.5} fill="url(#ug)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue pie */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">Revenue Split</h2>
            <p className="text-xs text-slate-400 mb-4">By subscription plan</p>
            {revPie.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={revPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="amount">
                      {revPie.map((_:any, i:number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v:number) => [`₹${formatNumber(v)}`, 'Revenue']} contentStyle={{borderRadius:12, fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {revPie.map((r:any, i:number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:CHART_COLORS[i%CHART_COLORS.length]}}/>
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
              <div className="flex items-center justify-center h-40 text-slate-300 text-sm flex-col gap-2">
                <BarChart2 size={32} className="text-slate-200"/>
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* ── Revenue bar + Exam distribution ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">Monthly Revenue</h2>
            <p className="text-xs text-slate-400 mb-4">₹ earned per month</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revChart} margin={{top:5, right:5, bottom:0, left:-15}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`} domain={[0,'auto']} allowDataOverflow={false}/>
                <Tooltip formatter={(v:number) => [`₹${formatNumber(v)}`, 'Revenue']} contentStyle={{borderRadius:12, fontSize:12}}/>
                <Bar dataKey="value" fill="#1565C0" radius={[6,6,0,0]} maxBarSize={40}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">Exam Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Which exams users are preparing for</p>
            <div className="space-y-3">
              {examDist.length === 0
                ? <div className="h-40 flex items-center justify-center text-slate-300 text-sm flex-col gap-2"><Target size={32} className="text-slate-200"/>No data yet</div>
                : examDist.slice(0, 6).map((e:any, i:number) => {
                    const total = examDist.reduce((a:number,x:any) => a + parseInt(x.users||0), 0) || 1
                    const pct   = Math.round(parseInt(e.users||0) / total * 100)
                    return (
                      <div key={e.exam} className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 w-4 shrink-0">{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700 truncate">{e.exam}</span>
                            <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">{formatNumber(e.users)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background:CHART_COLORS[i%CHART_COLORS.length]}}/>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8 text-right shrink-0">{pct}%</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Content counters + Quick actions ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Content grid */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Content Library</h2>
              <span className="text-xs text-slate-400">Click to manage</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label:'Courses',     value:stats?.totalCourses||0,  icon:<BookOpen size={16} className="text-blue-600"/>,    href:'/courses',          color:'bg-blue-50/60' },
                { label:'Materials',   value:stats?.totalStudyMaterials ?? stats?.totalMaterials ?? 0,icon:<FileText size={16} className="text-teal-600"/>,    href:'/study-materials',  color:'bg-teal-50/60' },
                { label:'Quizzes',     value:stats?.totalQuizzes||0,  icon:<HelpCircle size={16} className="text-purple-600"/>,href:'/quizzes',          color:'bg-purple-50/60' },
                { label:'Flashcards',  value:stats?.totalFlashcards||0,icon:<Zap size={16} className="text-yellow-600"/>,      href:'/flashcards',       color:'bg-yellow-50/60' },
                { label:'Affairs',     value:stats?.totalAffairs||0,  icon:<Newspaper size={16} className="text-orange-600"/>, href:'/current-affairs',  color:'bg-orange-50/60' },
                { label:'Active Jobs', value:stats?.activeJobs||0,    icon:<Briefcase size={16} className="text-green-600"/>,  href:'/jobs',             color:'bg-green-50/60' },
              ].map(s => (
                <ContentCard key={s.label} {...s}/>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <h2 className="font-bold text-slate-900">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label:'Add Current Affairs', href:'/current-affairs',  icon:<Newspaper size={15}/>, color:'text-blue-600',   bg:'bg-blue-50',   hover:'hover:bg-blue-100' },
                { label:'Create New Quiz',      href:'/quizzes',         icon:<HelpCircle size={15}/>,color:'text-purple-600', bg:'bg-purple-50', hover:'hover:bg-purple-100' },
                { label:'Send Notification',    href:'/notifications',   icon:<Activity size={15}/>,  color:'text-orange-600', bg:'bg-orange-50', hover:'hover:bg-orange-100' },
                { label:'Manage Users',         href:'/users',           icon:<Users size={15}/>,     color:'text-green-600',  bg:'bg-green-50',  hover:'hover:bg-green-100' },
                { label:'View Leaderboard',     href:'/leaderboard',     icon:<Award size={15}/>,     color:'text-amber-600',  bg:'bg-amber-50',  hover:'hover:bg-amber-100' },
                { label:'App Settings',         href:'/settings',        icon:<BookMarked size={15}/>,color:'text-slate-600',  bg:'bg-slate-50',  hover:'hover:bg-slate-100' },
              ].map(a => (
                <Link key={a.label} href={a.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${a.bg} ${a.hover} group`}>
                  <span className={`${a.color} shrink-0`}>{a.icon}</span>
                  <span className={`text-sm font-semibold ${a.color} flex-1`}>{a.label}</span>
                  <ArrowRight size={13} className={`${a.color} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}/>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
