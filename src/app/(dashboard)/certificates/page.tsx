'use client'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData } from '@/lib/hooks'
import { PageLoader, ErrorMessage, EmptyState } from '@/components/ui/feedback'
import { Award, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export default function CertificatesPage() {
  const { data, loading, error, refetch } = useApiData<any>(
    () => api.certificates.list(), []
  )
  const certs: any[] = data?.certificates || []

  const thisMonth = certs.filter(c => {
    const d = new Date(c.issued_at)
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  return (
    <div className="min-h-screen">
      <Header title="Certificates" subtitle="View and manage completion certificates" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Issued',  value: certs.length,  emoji: '🏆' },
            { label: 'This Month',    value: thisMonth,      emoji: '📅' },
            { label: 'Unique Courses',value: new Set(certs.map(c => c.course_id)).size, emoji: '📚' },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <div className="card"><ErrorMessage message={error} onRetry={refetch} /></div>
        ) : certs.length === 0 ? (
          <div className="card"><EmptyState icon="🏆" title="No certificates issued yet" subtitle="Certificates are issued automatically when students complete courses" /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Student', 'Course', 'Issued', 'Certificate', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {certs.map(cert => (
                  <tr key={cert.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {cert.user_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{cert.user_name}</p>
                          <p className="text-xs text-slate-400">{cert.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{cert.course_title}</p>
                      <p className="text-xs text-slate-400">{cert.subject}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {cert.certificate_url
                        ? <span className="badge bg-green-100 text-green-700 border-green-200">✅ Available</span>
                        : <span className="badge bg-amber-50 text-amber-600 border-amber-200">⏳ Not yet generated</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {cert.certificate_url && (
                          <>
                            <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                              <ExternalLink size={13} className="text-blue-600" />
                            </a>
                            <a href={cert.certificate_url} download
                              className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors">
                              <Download size={13} className="text-green-600" />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
