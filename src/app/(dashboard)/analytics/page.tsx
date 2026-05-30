'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { formatNumber } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { RefreshCw, TrendingUp, Users, BookOpen, CreditCard, Activity, Target } from 'lucide-react'

const PIE_COLORS = ['#1565C0','#9B59B6','#2ECC71','#F39C12','#E74C3C','#1ABC9C']

export default function AnalyticsPage() {
  const { showToast, ToastComponent } = useToast()
  const [stats,     setStats]     = useState<any>(null)
  const [userChart, setUserChart] = useState<any[]>([])
  const [revChart,  setRevChart]  = useState<any[]>([])
  const [examDist,  setExamDist]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, uc, rc, ed] = await Promise.allSettled([
        api.dashboard.getStats(),
        api.dashboard.getChart('users'),
        api.dashboard.getChart('revenue'),
        api.dashboard.getExamDistribution(),
      ])
      if (s.status  === 'fulfilled') setStats(s.value?.data)
      if (uc.status === 'fulfilled') setUserChart(uc.value?.data?.data || [])
      if (rc.status === 'fulfilled') setRevChart(rc.value?.data?.data  || [])
      if (ed.status === 'fulfilled') setExamDist(ed.value?.data?.data  || [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const kpis = [
    { label:'Total Users',    value:formatNumber(stats?.totalUsers||0),              sub:`+${formatNumber(stats?.newThisMonth||0)} this month`,  icon:<Users size={18}/>,       bg:'bg-blue-50',    text:'text-blue-600' },
    { label:'Active Today',   value:formatNumber(stats?.activeToday||0),             sub:'Unique active sessions',                               icon:<Activity size={18}/>,    bg:'bg-green-50',   text:'text-green-600' },
    { label:'Revenue/Month',  value:`₹${formatNumber(stats?.revenueThisMonth||0)}`,  sub:`Last: ₹${formatNumber(stats?.revenueLastMonth||0)}`,    icon:<CreditCard size={18}/>,  bg:'bg-purple-50',  text:'text-purple-600' },
    { label:'Quiz Accuracy',  value:`${parseFloat(stats?.avgAccuracy||0).toFixed(1)}%`, sub:'30-day average',                                   icon:<Target size={18}/>,      bg:'bg-orange-50',  text:'text-orange-600' },
    { label:'Active Subs',    value:formatNumber(stats?.activeSubscriptions||0),     sub:'Currently active',                                     icon:<TrendingUp size={18}/>,  bg:'bg-indigo-50',  text:'text-indigo-600' },
    { label:'Total Courses',  value:formatNumber(stats?.totalCourses||0),            sub:'Published courses',                                    icon:<BookOpen size={18}/>,    bg:'bg-teal-50',    text:'text-teal-600' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Analytics" subtitle="Key metrics and performance insights"/>
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">

        <div className="flex justify-end">
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={13} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map(s => (
            <div key={s.label} className="card p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <span className={s.text}>{s.icon}</span>
              </div>
              <p className="text-xl font-black text-slate-900">{loading ? '—' : s.value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">User Growth</h2>
            <p className="text-xs text-slate-400 mb-4">New registrations per month</p>
            {userChart.length === 0 && !loading ? (
              <p className="text-center text-slate-400 text-sm py-12">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={userChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v)}/>
                  <Tooltip formatter={(v:number)=>[formatNumber(v),'Users']} contentStyle={{borderRadius:12,fontSize:12}}/>
                  <Line type="monotone" dataKey="value" stroke="#1565C0" strokeWidth={2.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-slate-900 mb-1">Monthly Revenue</h2>
            <p className="text-xs text-slate-400 mb-4">₹ earned per month</p>
            {revChart.length === 0 && !loading ? (
              <p className="text-center text-slate-400 text-sm py-12">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v/1000}k`}/>
                  <Tooltip formatter={(v:number)=>[`₹${formatNumber(v)}`,'Revenue']} contentStyle={{borderRadius:12,fontSize:12}}/>
                  <Bar dataKey="value" fill="#1565C0" radius={[6,6,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Exam Distribution */}
        <div className="card p-5">
          <h2 className="font-bold text-slate-900 mb-1">Exam Distribution</h2>
          <p className="text-xs text-slate-400 mb-4">Which exams users are preparing for</p>
          {examDist.length === 0 && !loading ? (
            <p className="text-center text-slate-400 text-sm py-8">No exam distribution data yet</p>
          ) : (
            <div className="space-y-3">
              {examDist.slice(0,8).map((e:any, i:number) => {
                const total = examDist.reduce((a:number,x:any)=>a+parseInt(x.users||0),0)||1
                const pct = Math.round(parseInt(e.users||0)/total*100)
                return (
                  <div key={e.exam} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 w-5 shrink-0">{i+1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-700">{e.exam}</span>
                        <span className="text-xs font-bold text-slate-500">{formatNumber(e.users)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 w-8 text-right shrink-0">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}