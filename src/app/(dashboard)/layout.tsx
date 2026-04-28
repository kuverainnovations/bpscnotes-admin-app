import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main style={{ marginLeft: 'var(--sidebar-w)' }} className="min-h-screen">
        {children}
      </main>
    </div>
  )
}
