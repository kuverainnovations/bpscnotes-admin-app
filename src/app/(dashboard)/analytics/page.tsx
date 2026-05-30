'use client'

import { useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Users, TrendingUp, Target, Bell, CreditCard, BookOpen,
  ExternalLink, RefreshCw, Activity, Zap, Send, Clock
} from 'lucide-react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { formatNumber } from '@/lib/utils'

const TRACKED_EVENTS = [
  { key: 'app_open',            label: 'App Opens',          icon: '📱', color: '#1565C0' },
  { key: 'login',               label: 'Logins',             icon: '🔑', color: '#2ECC71' },
  { key: 'quiz_started',        label: 'Quizzes Started',    icon: '❓', color: '#9B59B6' },
  { key: 'quiz_completed',      label: 'Quizzes Completed',  icon: '✅', color: '#1ABC9C' },
  { key: 'course_enrolled',     label: 'Course Enrollments', icon: '📚', color: '#F39C12' },
  { key: 'payment_success',     label: 'Payments',           icon: '💳', color: '#2ECC71' },
  { key: 'payment_failed',      label: 'Failed Payments',    icon: '❌', color: '#E74C3C' },
  { key: 'article_read',        label: 'Articles Read',      icon: '📰', color: '#3498DB' },
  { key: 'study_session_ended', label: 'Study Sessions',     icon: '⏱️', color: '#E67E22' },
  { key: 'material_downloaded', label: 'Downloads',          icon: '📥', color: '#8E44AD' },
  { key: 'notification_tapped', label: 'Notif Taps',         icon: '🔔', color: '#F39C12' },
  { key: 'tier_promoted',       label: 'Tier Promotions',    icon: '⬆️', color: '#F1C40F' },
]

const NOTIFICATION_TYPES = [
  { type: 'announcement',    label: 'Announcement',    channel: 'general' },
  { type: 'new_course',      label: 'New Course',      channel: 'courses' },
  { type: 'quiz_result',     label: 'Quiz Result',     channel: 'quizzes' },
  { type: 'tier_promotion',  label: 'Tier Promotion',  channel: 'study_rooms' },
  { type: 'demotion_warning',label: 'Demotion Warning',channel: 'study_rooms' },
  { type: 'weekly_rank',     label: 'Weekly Rank',     channel: 'study_rooms' },
  { type: 'new_job',         label: 'New Job',         channel: 'jobs' },
  { type: 'ca_update',       label: 'Current Affairs', channel: 'current_affairs' },
  { type: 'payment',         label: 'Payment Confirm', channel: 'payments' },
  { type: 'material_approved',label:'Material Approved',channel:'materials' },
]

export default function AnalyticsDashboard() {
  const [stats,       setStats]       = useState<any>(null)
  const [userChart,   setUserChart]   = useState<any[]>([])
  const [revChart,    setRevChart]    = useState<any[]>([])
  const [examDist,    setExamDist]    = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)
  const [notifResult, setNotifResult] = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState<'overview'|'events'|'notify'>('overview')
  const notifRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    title: '', body: '', type: 'announcement',
    target: 'all', targetExam: '', scheduledAt: ''
  })

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
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const sendNotif = async () => {
    if (!form.title || !form.body) return
    setSending(true); setNotifResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ ...form, targetExam: form.targetExam||undefined, scheduledAt: form.scheduledAt||undefined })
      })
      const data = await res.json()
      setNotifResult(`✅ Sent to ${data.data?.totalSent || 0} users (push: ${data.data?.pushSuccess || 0})`)
      setForm({ title: '', body: '', type: 'announcement', target: 'all', targetExam: '', scheduledAt: '' })
    } catch {
      setNotifResult('❌ Failed to send')
    }
    setSending(false)
  }

  const PIE_COLORS = ['#1565C0','#9B59B6','#2ECC71','#F39C12','#E74C3C','#1ABC9C','#F1C40F','#8E44AD']

  const kpis = [
    { label: 'Total Users',    value: formatNumber(stats?.totalUsers||0),              sub: `+${formatNumber(stats?.newThisMonth||0)} this month`,    icon: <Users size={18}/>,       color: 'blue' },
    { label: 'Active Today',   value: formatNumber(stats?.activeToday||0),             sub: 'Unique sessions',                                         icon: <Activity size={18}/>,    color: 'green' },
    { label: 'Revenue (Month)',value: `₹${formatNumber(stats?.revenueThisMonth||0)}`,  sub: `Last: ₹${formatNumber(stats?.revenueLastMonth||0)}`,       icon: <CreditCard size={18}/>,  color: 'purple' },
    { label: 'Active Subs',    value: formatNumber(stats?.activeSubscriptions||0),     sub: 'Currently active',                                        icon: <TrendingUp size={18}/>,  color: 'indigo' },
    { label: 'Quizzes Today',  value: formatNumber(stats?.quizzesToday||stats?.dailyQuizzes||0), sub:'Attempts',                                       icon: <Target size={18}/>,      color: 'orange' },
    { label: 'Courses',        value: formatNumber(stats?.totalCourses||0),            sub: 'Published',                                               icon: <BookOpen size={18}/>,    color: 'teal' },
  ]

  const colorMap: Record<string, string> = {
    blue:'bg-blue-50 text-blue-600', green:'bg-green-50 text-green-600',
    purple:'bg-purple-50 text-purple-600', indigo:'bg-indigo-50 text-indigo-600',
    orange:'bg-orange-50 text-orange-600', teal:'bg-teal-50 text-teal-600',
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'events',   label: '📡 Events' },
    { id: 'notify',   label: '🔔 Send Notification' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Analytics & Notifications" subtitle="Metrics · PostHog events · Firebase push" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Top links row */}
        <div className="flex gap-3 flex-wrap">
          <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1565C0] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <span>📊</span> PostHog Dashboard <ExternalLink size={14} />
          </a>
          <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            <span>🔥</span> Firebase Console <ExternalLink size={14} />
          </a>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors ml-auto">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorMap[k.color]}`}>{k.icon}</div>
              <p className="text-xl font-extrabold text-gray-900">{loading ? '—' : k.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4">👥 User Growth (30d)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={userChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{fontSize:11}} tickFormatter={d => d?.slice(5)||d} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#1565C0" strokeWidth={2} dot={false} name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4">💰 Revenue (30d)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{fontSize:11}} tickFormatter={d => d?.slice(5)||d} />
                    <YAxis tick={{fontSize:11}} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v:any) => [`₹${v}`, 'Revenue']} />
                    <Bar dataKey="amount" fill="#9B59B6" radius={[4,4,0,0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exam distribution */}
            {examDist.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4">🎯 Exam Distribution</h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={examDist} dataKey="count" nameKey="exam" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                        {examDist.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 min-w-[180px]">
                    {examDist.map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor: PIE_COLORS[i%PIE_COLORS.length]}} />
                        <span className="text-xs text-gray-600">{d.exam}: <strong>{d.count}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Avg Quiz Accuracy', value: `${parseFloat(stats?.avgAccuracy||0).toFixed(1)}%`, icon: '🎯' },
                { label: 'Study Sessions (7d)', value: formatNumber(stats?.studySessions7d||0), icon: '⏱️' },
                { label: 'Coin Circulation', value: formatNumber(stats?.coinCirculation||0), icon: '🪙' },
                { label: 'FCM Tokens', value: formatNumber(stats?.fcmTokens||stats?.usersWithFcm||0), icon: '📲' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="text-xl font-extrabold text-gray-900">{loading ? '—' : s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EVENTS TAB ─────────────────────────────────── */}
        {activeTab === 'events' && (
          <div className="space-y-5">
            <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white rounded-2xl hover:opacity-90 transition-opacity">
              <div className="text-3xl">📊</div>
              <div className="flex-1">
                <p className="font-bold text-lg">Open Full PostHog Dashboard</p>
                <p className="text-sm opacity-80">Funnels · Session replays · User paths · Cohorts · Feature flags · A/B tests</p>
              </div>
              <ExternalLink size={20} className="opacity-70" />
            </a>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">📡 All Tracked Events</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">PostHog + Firebase Analytics</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {TRACKED_EVENTS.map(ev => (
                  <div key={ev.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xl">{ev.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800">{ev.label}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{ev.key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup checklist */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-bold text-amber-900 mb-3">🔥 Firebase + PostHog Setup</h3>
              <div className="space-y-2 text-sm text-amber-800">
                {[
                  ['Firebase Android', 'Add Android app → download google-services.json → place in app/ folder'],
                  ['FCM Backend Key', 'Firebase Console → Project Settings → Service Accounts → Generate private key → add to backend .env'],
                  ['PostHog', 'app.posthog.com → Create project → copy API key → set in BpscApplication.kt'],
                  ['Backend .env', 'Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'],
                  ['Test push', 'Use Send Notification tab → send a test to yourself'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">◆</span>
                    <div><strong>{title}:</strong> {desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFY TAB ─────────────────────────────────── */}
        {activeTab === 'notify' && (
          <div className="max-w-2xl space-y-4" ref={notifRef}>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bell size={20} className="text-blue-600" />
                <h2 className="font-bold text-gray-900 text-lg">Send Push Notification</h2>
              </div>

              {notifResult && (
                <div className={`p-3 rounded-xl mb-4 text-sm font-semibold ${notifResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {notifResult}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Notification Type</label>
                    <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {NOTIFICATION_TYPES.map(t => (
                        <option key={t.type} value={t.type}>{t.label} → #{t.channel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Audience</label>
                    <select value={form.target} onChange={e => setForm(p => ({...p, target: e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="all">🌍 All Users</option>
                      <option value="pro">⭐ Pro Subscribers</option>
                      <option value="free">🆓 Free Users</option>
                      <option value="exam">🎯 By Exam</option>
                    </select>
                  </div>
                </div>

                {form.target === 'exam' && (
                  <input placeholder="Exam name (e.g. BPSC 70th CCE)"
                    value={form.targetExam}
                    onChange={e => setForm(p => ({...p, targetExam: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                  <input placeholder="Short, attention-grabbing title"
                    value={form.title}
                    onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">{form.title.length}/65 chars</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Message *</label>
                  <textarea placeholder="Notification body — keep it concise and actionable"
                    value={form.body}
                    onChange={e => setForm(p => ({...p, body: e.target.value}))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-gray-400 mt-1">{form.body.length}/240 chars</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    <Clock size={12} className="inline mr-1" />
                    Schedule (leave blank to send now)
                  </label>
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e => setForm(p => ({...p, scheduledAt: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>

                {/* Preview */}
                {(form.title || form.body) && (
                  <div className="bg-gray-900 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">📱 PREVIEW</p>
                    <div className="bg-white rounded-xl p-3 flex items-start gap-3">
                      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">B</div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{form.title || 'Title…'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{form.body || 'Message…'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={sendNotif}
                  disabled={sending || !form.title || !form.body}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Send size={15} />
                  {sending ? 'Sending…' : form.scheduledAt ? '⏰ Schedule Notification' : '🚀 Send Now'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}