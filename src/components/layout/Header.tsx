'use client'
import { Bell, Search, Moon, Sun, RefreshCw, LogOut, User, X, CheckCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import api from '@/lib/api'

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { admin, logout }                 = useAuth()
  const router                            = useRouter()
  const [dark, setDark]                   = useState(false)
  const [unread, setUnread]               = useState(0)
  const [showNotifDrop, setShowNotif]     = useState(false)
  const [showProfileDrop, setShowProfile] = useState(false)
  const [notifs, setNotifs]               = useState<any[]>([])
  const [markingRead, setMarkingRead]     = useState(false)
  const notifRef   = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // ── Issue 5: Dark mode — read persisted value on mount ─────
  useEffect(() => {
    const saved = localStorage.getItem('bpsc_theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark)
    if (shouldBeDark) applyDark(true)
    else applyDark(false)
  }, [])

  const applyDark = (value: boolean) => {
    setDark(value)
    // Toggle on <html> AND <body> to catch all Tailwind dark: variants
    document.documentElement.classList.toggle('dark', value)
    document.body.classList.toggle('dark', value)
    localStorage.setItem('bpsc_theme', value ? 'dark' : 'light')
  }

  // ── Issue 4: Load notifications + unread count ──────────────
  const loadNotifs = () => {
    api.notifications.list()
      .then(res => {
        const list: any[] = res.data?.notifications || []
        setNotifs(list.slice(0, 6))
        // Count admin-sent notifications not yet read (status !== 'read')
        setUnread(list.filter((n: any) => !n.is_read && n.status !== 'read').length)
      })
      .catch(() => {})
  }

  useEffect(() => { loadNotifs() }, [])

  // ── Issue 4: Mark all read when dropdown opens ──────────────
  const handleOpenNotifs = async () => {
    const wasOpen = showNotifDrop
    setShowNotif(!wasOpen)
    setShowProfile(false)
    if (!wasOpen && unread > 0) {
      setMarkingRead(true)
      try {
        await api.notifications.markAllRead?.()
        setUnread(0)
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      } catch { /* silent */ }
      finally { setMarkingRead(false) }
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = admin?.name
    ? admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA'

  const AVATAR_COLORS = ['#1565C0', '#9B59B6', '#2ECC71', '#E67E22', '#E74C3C', '#1ABC9C']
  const avatarColor   = AVATAR_COLORS[(admin?.name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">

        {/* Issue 3: Search removed from header — each page has its own contextual search */}

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title="Refresh page"
        >
          <RefreshCw size={14} className="text-slate-600 dark:text-slate-400" />
        </button>

        {/* Issue 4: Notifications — clears badge on open */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleOpenNotifs}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors relative"
            title="Notifications"
          >
            <Bell size={14} className="text-slate-600 dark:text-slate-400" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold px-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {showNotifDrop && (
            <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="font-semibold text-slate-800 dark:text-white text-sm">Notifications</p>
                <div className="flex items-center gap-2">
                  {markingRead && <span className="text-[10px] text-slate-400">Marking read…</span>}
                  <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {notifs.length === 0
                  ? <div className="p-6 text-center text-slate-400 text-sm">No notifications yet</div>
                  : notifs.map((n: any) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400">👥 {n.total_sent ?? 0} sent</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${n.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {n.status}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <a href="/notifications" className="text-xs text-brand-600 hover:underline font-medium">
                  View all →
                </a>
                {unread === 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <CheckCheck size={11} /> All read
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Issue 5: Dark / light mode toggle — actually switches theme */}
        <button
          onClick={() => applyDark(!dark)}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark
            ? <Sun  size={14} className="text-amber-500" />
            : <Moon size={14} className="text-slate-600" />}
        </button>

        {/* Issue 6: Live indicator REMOVED — not needed in admin header */}

        {/* Issue 7: Admin profile dropdown */}
        {admin && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfileDrop); setShowNotif(false) }}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
              title="Admin profile"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900 shadow-sm"
                style={{ background: avatarColor }}
              >
                {initials}
              </div>
            </button>

            {showProfileDrop && (
              <div className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
                {/* Profile header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: avatarColor }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{admin.name}</p>
                      <p className="text-xs text-slate-400 truncate">{admin.email}</p>
                      {admin.permissions?.includes('all') && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                          Super Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permissions summary */}
                {admin.permissions && !admin.permissions.includes('all') && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {admin.permissions.slice(0, 6).map((p: string) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {p}
                        </span>
                      ))}
                      {admin.permissions.length > 6 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
                          +{admin.permissions.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}