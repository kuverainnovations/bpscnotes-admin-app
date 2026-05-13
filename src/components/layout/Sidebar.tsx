'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, BookOpen, FileText, HelpCircle,
  Briefcase, Newspaper, CreditCard, Bell, Coins, Users2,
  Trophy, Radio, Award, Image, Tag, CheckSquare, Settings,
  Shield, GraduationCap, ChevronRight, LogOut, Zap, Brain, Layers, AlertTriangle
} from 'lucide-react'

const nav = [
  { group: 'Overview',
    items: [
      { href: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  { group: 'Users',
    items: [
      { href: '/users',          icon: Users,           label: 'User Management' },
      { href: '/roles',          icon: Shield,          label: 'Admin Roles' },
    ]
  },
  { group: 'Content',
    items: [
      { href: '/content',        icon: BookOpen,        label: 'Courses' },
      { href: '/content/notes',  icon: FileText,        label: 'Notes & Library' },
      { href: '/quizzes',        icon: HelpCircle,      label: 'Quizzes & Mock Tests' },
      { href: '/current-affairs',icon: Newspaper,       label: 'Current Affairs' },
      { href: '/flashcards',     icon: Brain,           label: 'Flashcards (Active Recall)' },
      { href: '/reviews',        icon: CheckSquare,     label: 'Review Uploads' },
    ]
  },
  { group: 'Exams & Jobs',
    items: [
      { href: '/exams',          icon: GraduationCap,   label: 'Exam Management' },
      { href: '/jobs',           icon: Briefcase,       label: 'Job Vacancies' },
    ]
  },
  { group: 'Revenue',
    items: [
      { href: '/subscriptions',  icon: CreditCard,      label: 'Subscriptions' },
      { href: '/coupons',        icon: Tag,             label: 'Coupon Codes' },
      { href: '/coins',          icon: Coins,           label: 'Coins & Rewards' },
    ]
  },
  { group: 'Engage',
    items: [
      { href: '/notifications',  icon: Bell,            label: 'Notifications' },
      { href: '/study-rooms',    icon: Users2,          label: 'Study Rooms' },
      { href: '/tier-rooms',         icon: Layers,          label: 'Tier Room System' },
      { href: '/tier-rooms/flagged', icon: AlertTriangle,   label: 'Anti-Cheat Review' },
      { href: '/achievements',   icon: Trophy,          label: 'Achievements' },
      { href: '/challenges',     icon: Zap,             label: 'Weekly Challenges' },
      { href: '/live-classes',   icon: Radio,           label: 'Live Classes' },
      { href: '/leaderboard',    icon: Trophy,          label: 'Leaderboard' },
      { href: '/certificates',   icon: Award,           label: 'Certificates' },
      { href: '/banners',        icon: Image,           label: 'Banners & Offers' },
    ]
  },
  { group: 'System',
    items: [
      { href: '/settings',       icon: Settings,        label: 'App Settings' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen bg-white border-r border-slate-100 flex flex-col z-40"
      style={{ width: 'var(--sidebar-w)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand">
            <span className="text-white font-black text-lg" style={{ fontFamily: 'DM Serif Display, serif' }}>B</span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">BPSCNotes</p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map(group => (
          <div key={group.group}>
            <p className="nav-link-group">{group.group}</p>
            {group.items.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}
                  className={cn('nav-link', active && 'active')}>
                  <item.icon size={16} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight size={14} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Admin profile */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">SA</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Super Admin</p>
            <p className="text-xs text-slate-400 truncate">admin@bpscnotes.com</p>
          </div>
          <LogOut size={14} className="text-slate-400 shrink-0" />
        </div>
      </div>
    </aside>
  )
}
