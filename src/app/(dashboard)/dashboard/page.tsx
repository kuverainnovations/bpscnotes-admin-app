'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const PIE_COLORS = ['#1565C0', '#42A5F5', '#90CAF9']

export default function DashboardPage() {
  const [stats, setStats]         = useState<any>(null)
  const [userChart, setUserChart] = useState<any[]>([])
  const [revChart, setRevChart]   = useState<any[]>([])
  const [revPie, setRevPie]       = useState<any[]>([])
  const [examDist, setExamDist]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const { admin, isLoading } = useAuth()

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [s, uc, rc, rp, ed] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getChart('users'),
        api.dashboard.getChart('revenue'),
        api.dashboard.getRevenueBreakdown(),
        api.dashboard.getExamDistribution(),
      ])
      setStats(s.data)
      setUserChart(uc.data?.data || [])
      setRevChart(rc.data?.data || [])
      setRevPie(rp.data?.data || [])
      setExamDist(ed.data?.data || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    if (isLoading || !admin) return
  
    load()
  }, [admin, isLoading])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 text-center max-w-sm">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-red-500 font-semibold mb-2">{error}</p>
        <p className="text-slate-400 text-sm mb-4">Make sure backend is running at localhost:5000</p>
        <button onClick={load} className="btn-primary gap-2"><RefreshCw size={14} />Retry</button>
      </div>
    </div>
  )

  const cards = [
    { label:'Total Users',      value: formatNumber(stats?.totalUsers||0),             sub:`+${formatNumber(stats?.newThisWeek||0)} this week`,  color:'bg-blue-50',   icon:'👥' },
    { label:'Revenue (Month)',  value:`₹${formatNumber(stats?.revenueThisMonth||0)}`,  sub:`${stats?.revenueGrowthPct>=0?'+':''}${stats?.revenueGrowthPct||0}% vs last`, color:'bg-green-50',  icon:'💰' },
    { label:'Active Subs',      value: formatNumber(stats?.activeSubscriptions||0),    sub:'Currently active',   color:'bg-purple-50', icon:'👑' },
    { label:'Avg Accuracy',     value:`${stats?.avgAccuracy||0}%`,                     sub:'Quiz performance',   color:'bg-orange-50', icon:'🎯' },
    { label:'Coin Circulation', value: formatNumber(stats?.coinCirculation||0),        sub:'Total coins earned',  color:'bg-yellow-50', icon:'🪙' },
    { label:'Active Today',     value: formatNumber(stats?.activeToday||0),            sub:'Users active today', color:'bg-red-50',    icon:'📡' },
  ]

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle="Welcome back! Here's what's happening with BPSCNotes." />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map(c => (
            <div key={c.label} className={`card p-4 ${c.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{c.icon}</span>
                <TrendingUp size={13} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{c.label}</p>
              <p className="text-xs text-slate-400">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 lg:col-span-2">
            <h2 className="section-title">User Growth</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userChart}>
                <defs>
                  <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1565C0" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)}/>
                <Tooltip formatter={(v:number) => [formatNumber(v),'Users']} contentStyle={{borderRadius:12,fontSize:12}}/>
                <Area type="monotone" dataKey="value" stroke="#1565C0" strokeWidth={2.5} fill="url(#ug)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="section-title">Revenue Split</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={revPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="amount">
                  {revPie.map((_:any, i:number) => <Cell key={i} fill={PIE_COLORS[i % 3]}/>)}
                </Pie>
                <Tooltip formatter={(v:number) => [`₹${formatNumber(v)}`,'Revenue']} contentStyle={{borderRadius:12,fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {revPie.map((r:any, i:number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background:PIE_COLORS[i%3]}}/>
                    <span className="text-xs text-slate-600 capitalize">{r.plan}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{r.count} users</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="section-title">Monthly Revenue</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`}/>
                <Tooltip formatter={(v:number) => [`₹${formatNumber(v)}`,'Revenue']} contentStyle={{borderRadius:12,fontSize:12}}/>
                <Bar dataKey="value" fill="#1565C0" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="section-title">Exam Distribution</h2>
            <div className="space-y-3">
              {examDist.slice(0,6).map((e:any) => {
                const total = examDist.reduce((a:number,x:any) => a+parseInt(x.users||0), 0) || 1
                const pct   = Math.round(parseInt(e.users||0)/total*100)
                return (
                  <div key={e.exam}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{e.exam}</span>
                      <span className="text-xs font-bold text-slate-800">{formatNumber(e.users)} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {label:'Courses',    value:stats?.totalCourses||0, emoji:'📚'},
            {label:'Notes',      value:stats?.totalNotes||0,   emoji:'📄'},
            {label:'Quizzes',    value:stats?.totalQuizzes||0, emoji:'🎯'},
            {label:'Affairs',    value:stats?.totalAffairs||0, emoji:'📰'},
            {label:'Active Jobs',value:stats?.activeJobs||0,   emoji:'💼'},
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'Add Current Affairs', href:'/current-affairs', emoji:'📰', color:'bg-blue-50 text-blue-700 hover:bg-blue-100'},
              {label:'Create Quiz',         href:'/quizzes',         emoji:'🎯', color:'bg-purple-50 text-purple-700 hover:bg-purple-100'},
              {label:'Upload Notes',        href:'/content/notes',   emoji:'📄', color:'bg-green-50 text-green-700 hover:bg-green-100'},
              {label:'Send Notification',   href:'/notifications',   emoji:'🔔', color:'bg-orange-50 text-orange-700 hover:bg-orange-100'},
            ].map(a => (
              <a key={a.label} href={a.href} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${a.color}`}>
                <span className="text-xl">{a.emoji}</span>
                <span className="text-sm font-semibold">{a.label}</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
