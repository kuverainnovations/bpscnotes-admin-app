'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Users, TrendingUp, Target, Bell, CreditCard, BookOpen, Zap, ExternalLink } from 'lucide-react'
import Header from '@/components/layout/Header'

const POSTHOG_PROJECT_ID = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID || ''
const POSTHOG_API_KEY    = process.env.NEXT_PUBLIC_POSTHOG_API_KEY    || ''

// Key events tracked in the app
const TRACKED_EVENTS = [
  { key: 'app_open',           label: 'App Opens',         icon: '📱', color: '#1565C0' },
  { key: 'login',              label: 'Logins',            icon: '🔑', color: '#2ECC71' },
  { key: 'quiz_started',       label: 'Quizzes Started',   icon: '❓', color: '#9B59B6' },
  { key: 'quiz_completed',     label: 'Quizzes Completed', icon: '✅', color: '#1ABC9C' },
  { key: 'course_enrolled',    label: 'Course Enrollments',icon: '📚', color: '#F39C12' },
  { key: 'payment_success',    label: 'Payments',          icon: '💳', color: '#2ECC71' },
  { key: 'payment_failed',     label: 'Failed Payments',   icon: '❌', color: '#E74C3C' },
  { key: 'article_read',       label: 'Articles Read',     icon: '📰', color: '#3498DB' },
  { key: 'study_session_ended',label: 'Study Sessions',    icon: '⏱️', color: '#E67E22' },
  { key: 'material_downloaded',label: 'Downloads',         icon: '📥', color: '#8E44AD' },
  { key: 'notification_tapped',label: 'Notif Taps',        icon: '🔔', color: '#F39C12' },
  { key: 'tier_promoted',      label: 'Tier Promotions',   icon: '⬆️', color: '#F1C40F' },
]

const NOTIFICATION_TYPES = [
  { type: 'new_course',       label: 'New Course',     channel: 'courses' },
  { type: 'material_approved',label: 'Material Approved','channel': 'materials' },
  { type: 'quiz_result',      label: 'Quiz Result',    channel: 'quizzes' },
  { type: 'tier_promotion',   label: 'Tier Promotion', channel: 'study_rooms' },
  { type: 'demotion_warning', label: 'Demotion Warning','channel': 'study_rooms' },
  { type: 'weekly_rank',      label: 'Weekly Rank',    channel: 'study_rooms' },
  { type: 'new_job',          label: 'New Job',        channel: 'jobs' },
  { type: 'ca_update',        label: 'Current Affairs',channel: 'current_affairs' },
  { type: 'payment',          label: 'Payment Confirm',channel: 'payments' },
  { type: 'announcement',     label: 'Announcement',   channel: 'general' },
]

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifForm, setNotifForm] = useState({
    title: '', body: '', type: 'announcement', target: 'all', targetExam: '', scheduledAt: ''
  })
  const [notifResult, setNotifResult] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      const data = await res.json()
      setStats(data.data)
    } catch {
      setStats(null)
    }
    setLoading(false)
  }

  const sendNotification = async () => {
    if (!notifForm.title || !notifForm.body) return
    setSendingNotif(true)
    setNotifResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({
          ...notifForm,
          targetExam: notifForm.targetExam || undefined,
          scheduledAt: notifForm.scheduledAt || undefined,
        })
      })
      const data = await res.json()
      setNotifResult(`✅ Sent to ${data.data?.totalSent || 0} users (push: ${data.data?.pushSuccess || 0})`)
      setNotifForm({ title: '', body: '', type: 'announcement', target: 'all', targetExam: '', scheduledAt: '' })
    } catch {
      setNotifResult('❌ Failed to send notification')
    }
    setSendingNotif(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Analytics & Notifications" subtitle="PostHog events · Firebase push · App metrics" />

      <div className="p-6 space-y-6 animate-fade-in">

        {/* PostHog link */}
        <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#1565C0] to-[#1E88E5] text-white rounded-2xl shadow hover:opacity-90 transition-opacity">
          <div className="text-2xl">📊</div>
          <div className="flex-1">
            <p className="font-bold text-lg">Open PostHog Dashboard</p>
            <p className="text-sm opacity-80">Funnels · Session replays · User paths · Cohorts · Feature flags</p>
          </div>
          <ExternalLink size={20} className="opacity-70" />
        </a>

        {/* Quick stats from backend */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Users (7d)', value: stats.activeUsers7d || '--', icon: <Users size={20}/>, color: 'bg-blue-50 text-blue-600' },
              { label: 'Quizzes Today',     value: stats.quizzesToday || '--',   icon: <Target size={20}/>, color: 'bg-purple-50 text-purple-600' },
              { label: 'Revenue (Month)',   value: `₹${stats.monthRevenue || 0}`, icon: <CreditCard size={20}/>, color: 'bg-green-50 text-green-600' },
              { label: 'Study Sessions',   value: stats.studySessions7d || '--', icon: <BookOpen size={20}/>, color: 'bg-orange-50 text-orange-600' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
                <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Events reference */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">📡 Tracked Events</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">PostHog + Firebase</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {TRACKED_EVENTS.map(ev => (
              <div key={ev.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-lg">{ev.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{ev.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{ev.key}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notification sender */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
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
                <select value={notifForm.type} onChange={e => setNotifForm(p => ({...p, type: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {NOTIFICATION_TYPES.map(t => (
                    <option key={t.type} value={t.type}>{t.label} → #{t.channel}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Audience</label>
                <select value={notifForm.target} onChange={e => setNotifForm(p => ({...p, target: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="all">🌍 All Users</option>
                  <option value="pro">⭐ Pro Subscribers</option>
                  <option value="free">🆓 Free Users</option>
                  <option value="exam">🎯 By Exam</option>
                </select>
              </div>
            </div>

            {notifForm.target === 'exam' && (
              <input placeholder="Exam name (e.g. BPSC 70th CCE)"
                value={notifForm.targetExam}
                onChange={e => setNotifForm(p => ({...p, targetExam: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
              <input placeholder="Notification title"
                value={notifForm.title}
                onChange={e => setNotifForm(p => ({...p, title: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Message *</label>
              <textarea placeholder="Notification body text"
                value={notifForm.body}
                onChange={e => setNotifForm(p => ({...p, body: e.target.value}))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Schedule (optional — leave blank to send now)</label>
              <input type="datetime-local" value={notifForm.scheduledAt}
                onChange={e => setNotifForm(p => ({...p, scheduledAt: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <button onClick={sendNotification}
              disabled={sendingNotif || !notifForm.title || !notifForm.body}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              <Bell size={16} />
              {sendingNotif ? 'Sending…' : notifForm.scheduledAt ? '⏰ Schedule Notification' : '🚀 Send Now'}
            </button>
          </div>
        </div>

        {/* Firebase setup guide */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-900 mb-3">🔥 Firebase + PostHog Setup Checklist</h3>
          <div className="space-y-2 text-sm text-amber-800">
            {[
              ['Firebase Console', 'Add Android app → download google-services.json → place in app/ folder'],
              ['FCM Credentials', 'Firebase Console → Project Settings → Service Accounts → Generate private key → add to backend .env'],
              ['PostHog', 'app.posthog.com → Create project → copy API key → set POSTHOG_API_KEY in BpscApplication.kt'],
              ['Backend .env', 'Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL'],
              ['Test push', 'Admin → Analytics → send test notification to yourself'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-2">
                <span className="text-amber-500 mt-0.5">◆</span>
                <div><strong>{title}:</strong> {desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
