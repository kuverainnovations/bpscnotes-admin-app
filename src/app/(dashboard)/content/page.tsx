'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, BookOpen, RefreshCw } from 'lucide-react'

const empty = { title:'', subject:'', instructor:'', price:0, originalPrice:0, isPaid:false, isFeatured:false, totalLessons:0, totalHours:0, examTags:['BPSC 70th CCE'], language:'Hindi + English', status:'draft' }

export default function ContentPage() {
  const [list, setList]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm]       = useState<any>(empty)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.courses.list({ search, status })
      setList(res.data?.courses || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [search, status])

  const openNew  = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ title:item.title, subject:item.subject, instructor:item.instructor||'', price:item.price, originalPrice:item.original_price, isPaid:item.is_paid, isFeatured:item.is_featured, totalLessons:item.total_lessons, totalHours:item.total_hours, examTags:item.exam_tags||[], language:item.language||'Hindi + English', status:item.status })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await api.courses.update(editing.id, form)
      else await api.courses.create(form)
      setShowModal(false); load()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this course?')) return
    await api.courses.delete(id); load()
  }

  const publish = async (id: string, current: string) => {
    await api.courses.update(id, { status: current === 'published' ? 'draft' : 'published' })
    load()
  }

  return (
    <div className="min-h-screen">
      <Header title="Courses" subtitle="Manage all courses — changes reflect instantly in mobile app"/>
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total Courses',    value: list.length,                                    emoji:'📚' },
            { label:'Published',        value: list.filter(c=>c.status==='published').length,  emoji:'✅' },
            { label:'Free Courses',     value: list.filter(c=>!c.is_paid).length,              emoji:'🆓' },
            { label:'Total Enrollments',value: formatNumber(list.reduce((a,c)=>a+(c.enrollment_count||0),0)), emoji:'👥' },
          ].map(s=>(
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses..." className="input pl-9"/>
          </div>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input w-auto">
            <option value="">All Status</option><option value="published">Published</option><option value="draft">Draft</option>
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14}/></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14}/>Add Course</button>
        </div>

        {loading ? (
          <div className="card p-12 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Course','Subject','Instructor','Price','Enrollments','Rating','Status','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(course=>(
                  <tr key={course.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><BookOpen size={16} className="text-blue-600"/></div>
                        <div>
                          <p className="font-semibold text-slate-800 max-w-[180px] truncate">{course.title}</p>
                          {course.is_featured && <span className="badge bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]">⭐ Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600 border-slate-200">{course.subject}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{course.instructor||'—'}</td>
                    <td className="px-4 py-3">
                      {course.is_paid
                        ? <div><p className="font-bold text-slate-900">₹{course.price}</p><p className="text-xs text-slate-400 line-through">₹{course.original_price}</p></div>
                        : <span className="badge bg-green-100 text-green-700 border-green-200">FREE</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatNumber(course.enrollment_count||0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm font-semibold">{parseFloat(course.rating||0).toFixed(1)}</span>
                        <span className="text-xs text-slate-400">({formatNumber(course.review_count||0)})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${getStatusColor(course.status)}`}>{course.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>publish(course.id, course.status)} className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all ${course.status==='published'?'bg-slate-100 text-slate-600 hover:bg-slate-200':'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {course.status==='published'?'Unpublish':'Publish'}
                        </button>
                        <button onClick={()=>openEdit(course)} className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors"><Edit size={13} className="text-yellow-600"/></button>
                        <button onClick={()=>del(course.id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 size={13} className="text-red-600"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div className="p-12 text-center text-slate-400">No courses found</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e=>e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{fontFamily:'DM Serif Display,serif'}}>{editing?'Edit Course':'Add Course'}</h3>
              <button onClick={()=>setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="Course title"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject *</label>
                  <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="input">
                    {['Polity','History','Economy','Geography','Bihar GK','Science & Tech','Maths','General Studies','Current Affairs','Environment'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Instructor</label><input value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})} className="input" placeholder="Instructor name"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={form.isPaid?'paid':'free'} onChange={e=>setForm({...form,isPaid:e.target.value==='paid'})} className="input">
                    <option value="free">Free</option><option value="paid">Paid</option>
                  </select>
                </div>
                {form.isPaid && <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Price (₹)</label><input type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} className="input"/></div>}
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Total Lessons</label><input type="number" value={form.totalLessons} onChange={e=>setForm({...form,totalLessons:Number(e.target.value)})} className="input"/></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Total Hours</label><input type="number" step="0.5" value={form.totalHours} onChange={e=>setForm({...form,totalHours:Number(e.target.value)})} className="input"/></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/><span className="text-sm">Featured</span></label>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input">
                  <option value="draft">Draft</option><option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title} className="btn-primary disabled:opacity-50">{saving?'Saving...':editing?'Update':'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
