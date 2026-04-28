'use client'
import { Bell, Search, Moon, Sun, RefreshCw, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import api from '@/lib/api'

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { admin, logout } = useAuth()
  const [dark, setDark]               = useState(false)
  const [unread, setUnread]           = useState(0)
  const [showNotifDrop, setShowNotif] = useState(false)
  const [notifs, setNotifs]           = useState<any[]>([])

  // ── Dark mode — persist to localStorage + apply to <html> ──
  useEffect(() => {
    const saved = localStorage.getItem('bpsc_theme')
    if (saved === 'dark') applyDark(true)
  }, [])

  const applyDark = (value: boolean) => {
    setDark(value)
    document.documentElement.classList.toggle('dark', value)
    localStorage.setItem('bpsc_theme', value ? 'dark' : 'light')
  }

  // ── Load unread count ───────────────────────────────────────
  useEffect(() => {
    api.notifications.list()
      .then(res => {
        const list = res.data?.notifications || []
        setNotifs(list.slice(0, 5))
        setUnread(list.filter((n: any) => n.status === 'sent').length)
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display, serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search anything..."
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 w-56 transition-all"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className="text-slate-600" />
        </button>

        {/* Notifications dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotifDrop)}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors relative"
          >
            <Bell size={14} className="text-slate-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifDrop && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                <button onClick={() => setShowNotif(false)} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
              </div>
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No notifications</div>
                ) : notifs.map((n: any) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">👥 {n.total_sent || 0} sent</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${n.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {n.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100">
                <a href="/notifications" className="text-xs text-brand-600 hover:underline font-medium">
                  View all notifications →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode */}
        <button
          onClick={() => applyDark(!dark)}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={14} className="text-slate-600" /> : <Moon size={14} className="text-slate-600" />}
        </button>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-700">Live</span>
        </div>

        {/* Admin info + logout */}
        {admin && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {admin.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
              title="Logout"
            >
              <LogOut size={14} className="text-red-600" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
