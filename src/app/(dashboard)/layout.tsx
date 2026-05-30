'use client'
import Sidebar from '@/components/layout/Sidebar'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden w-9 h-9 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center"
      >
        <Menu size={18} className="text-slate-600"/>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative h-full">
          <Sidebar onClose={() => setSidebarOpen(false)} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-3 md:hidden w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center"
          >
            <X size={14} className="text-slate-600"/>
          </button>
        </div>
      </div>

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="min-h-screen md:ml-[var(--sidebar-w)] transition-all">
        {children}
      </main>
    </div>
  )
}
