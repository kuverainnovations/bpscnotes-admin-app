'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard, Users, BookOpen, FileText, HelpCircle,
  Briefcase, Newspaper, CreditCard, Bell, Users2,
  Trophy, Radio, Award, Image, Tag, CheckSquare, Settings,
  Shield, GraduationCap, ChevronRight, ChevronDown, LogOut,
  Zap, Brain, Layers, AlertTriangle, Star, LibraryBig,
  Coins, TrendingUp, Activity, LifeBuoy, MapPin
} from 'lucide-react'

type NavItem = {
  href: string; icon: any; label: string
  addHref?: string; badge?: number
}
type NavGroup = { group: string; items: NavItem[]; defaultOpen?: boolean }

const NAV: NavGroup[] = [
  { group:'Overview',   defaultOpen:true,  items:[
    { href:'/dashboard',        icon:LayoutDashboard, label:'Dashboard' },
  ]},
  { group:'Users',      defaultOpen:true,  items:[
    { href:'/users',            icon:Users,           label:'User Management' },
    { href:'/roles',            icon:Shield,          label:'Admin Roles' },
  ]},
  { group:'Content',    defaultOpen:true,  items:[
    { href:'/courses',          icon:BookOpen,        label:'Courses' },
    { href:'/study-materials',  icon:LibraryBig,      label:'Study Materials' },
   // { href:'/support-escalations', icon:LifeBuoy,     label:'Support Escalations' },
    { href:'/quizzes',          icon:HelpCircle,      label:'Quizzes & Mock Tests' },
    { href:'/current-affairs',  icon:Newspaper,       label:'Current Affairs' },
    { href:'/flashcards',       icon:Brain,           label:'Flashcards' },
    // { href:'/reviews',          icon:CheckSquare,     label:'Review Uploads' },
  ]},
  { group:'Exams & Jobs', items:[
    { href:'/exams',            icon:GraduationCap,   label:'Exam Management' },
    { href:'/districts',        icon:MapPin,          label:'Districts' },
    { href:'/jobs',             icon:Briefcase,       label:'Job Vacancies' },
  ]},
  { group:'Revenue', items:[
    { href:'/subscriptions',    icon:CreditCard,      label:'Subscriptions' },
    { href:'/coupons',          icon:Tag,             label:'Coupon Codes' },
    { href:'/coins',            icon:Coins,           label:'Coins & Rewards' },
  ]},
  { group:'Engagement', defaultOpen:true, items:[
    { href:'/analytics',        icon:TrendingUp,      label:'Analytics' },
    { href:'/activity',         icon:Activity,        label:'Activity Log' },
    { href:'/notifications',    icon:Bell,            label:'Notifications' },
    { href:'/tier-rooms',       icon:Layers,          label:'Tier Room System' },
    { href:'/tier-rooms/flagged',icon:AlertTriangle,  label:'Anti-Cheat Review' },
    { href:'/achievements',     icon:Trophy,          label:'Achievements' },
    { href:'/challenges',       icon:Zap,             label:'Challenges' },
    { href:'/live-classes',     icon:Radio,           label:'Live Classes' },
    { href:'/leaderboard',      icon:Star,            label:'Leaderboard' },
    // TEMP #15: { href:'/certificates', icon:Award, label:'Certificates' },
    { href:'/banners',          icon:Image,           label:'Banners & Offers' },
  ]},
  { group:'System', defaultOpen:true, items:[
    { href:'/settings', icon:Settings, label:'App Settings' },
  ]},
]

type SidebarProps = {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname()
  const router   = useRouter()
  const { admin, logout } = useAuth()

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map(g => [g.group, g.defaultOpen ?? false]))
  )

  // Auto-open the group with the active route
  useEffect(() => {
    NAV.forEach(g => {
      const active = g.items.some(i =>
        pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href))
      )
      if (active) setOpen(prev => ({ ...prev, [g.group]: true }))
    })
  }, [pathname])

  const initials = admin?.name
    ? admin.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA'

  return (
    <aside className="fixed top-0 left-0 h-screen bg-white border-r border-slate-100 flex flex-col z-40"
      style={{ width: 'var(--sidebar-w)' }}>

      {/* Logo — Issue 2: click navigates to /dashboard */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand">
            <span className="text-white font-black text-lg" style={{ fontFamily:'DM Serif Display,serif' }}>B</span>
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">BPSCNotes</p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map(group => {
          const isOpen   = open[group.group] ?? false
          const hasActive = group.items.some(i =>
            pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href))
          )
          return (
            <div key={group.group}>
              <button
                onClick={() => setOpen(prev => ({ ...prev, [group.group]: !prev[group.group] }))}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 mt-3 mb-0.5 rounded-lg transition-colors',
                  hasActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">{group.group}</span>
                <ChevronDown size={11} className={cn('transition-transform', isOpen ? '' : '-rotate-90')} />
              </button>

              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const active = pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                      <div key={item.href} className="group relative flex items-center">
<Link
  href={item.href}
  onClick={() => onClose?.()}
  className={cn('nav-link flex-1 pr-7', active && 'active')}
>
                            <item.icon size={15} className="shrink-0" />
                          <span className="flex-1 truncate text-[13px]">{item.label}</span>
                          {active && <ChevronRight size={12} />}
                          {item.badge != null && item.badge > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </Link>
{/* + quick-add button removed */}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer — dynamic admin info */}
      <div className="px-3 py-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{admin?.name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{admin?.email || ''}</p>
          </div>
          <button onClick={() => { logout(); router.push('/') }}
            className="shrink-0 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
            title="Log out">
            <LogOut size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  )
}