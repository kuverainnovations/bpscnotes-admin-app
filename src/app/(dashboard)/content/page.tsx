'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { getStatusColor } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, BookOpen, RefreshCw, X, Check, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

// ════════════════════════════════════════════════════════════
// FILE: admin/src/app/(dashboard)/content/page.tsx
// Manages courses (existing) + chapters + lessons + what_you_learn
// ════════════════════════════════════════════════════════════

const EMPTY = {
  title:'', subject:'', instructor:'', instructorBio:'', instructorStudents:'',
  instructorCourses:1, description:'', price:0, originalPrice:0, isPaid:false,
  isFeatured:false, totalHours:0, totalLessons:0, examTags:['BPSC 70th CCE'],
  language:'Hindi + English', status:'draft',
  whatYouLearn:[] as string[], hasCertificate:true,
}

type Tab = 'details' | 'curriculum' | 'ratings'

export default function ContentPage() {
  const [list, setList]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState<Tab>('details')
  const switchTab = (t: Tab) => {
    setTab(t)
    if (t === 'curriculum' && editing?.id) {
      loadModalChapters(editing.id)
    }
  }
  const [toast, setToast]       = useState('')
  // Chapter/lesson management — table panel
  const [contentCourse, setContentCourse] = useState<any>(null)
  const [chapters, setChapters]           = useState<any[]>([])
  const [loadingCh, setLoadingCh]         = useState(false)
  const [expandedCh, setExpandedCh]       = useState<string|null>(null)
  const [newChTitle, setNewChTitle]       = useState('')
  const [addingLesson, setAddingLesson]   = useState<string|null>(null)
  const [newLesson, setNewLesson]         = useState({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })
  const [newLearnItem, setNewLearnItem]   = useState('')

  // Chapter/lesson management — modal curriculum tab (uses editing.id)
  const [modalChapters, setModalChapters]       = useState<any[]>([])
  const [modalLoadingCh, setModalLoadingCh]     = useState(false)
  const [modalExpandedCh, setModalExpandedCh]   = useState<string|null>(null)
  const [modalNewChTitle, setModalNewChTitle]   = useState('')
  const [modalAddingLesson, setModalAddingLesson] = useState<string|null>(null)
  const [modalNewLesson, setModalNewLesson]     = useState({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.courses.list({ search, status })
      setList(res.data?.courses || [])
    } catch {}
    finally { setLoading(false) }
  }, [search, status])

  useEffect(() => { load() }, [load])

  const loadChapters = async (courseId: string) => {
    setLoadingCh(true)
    try {
      const res = await api.courses.getChapters(courseId)
      setChapters(res.data?.chapters || [])
    } catch { showToast('Failed to load chapters') }
    finally { setLoadingCh(false) }
  }

  const loadModalChapters = async (courseId: string) => {
    setModalLoadingCh(true)
    try {
      const res = await api.courses.getChapters(courseId)
      setModalChapters(res.data?.chapters || [])
    } catch { showToast('Failed to load chapters') }
    finally { setModalLoadingCh(false) }
  }

  const openContent = (c: any) => { setContentCourse(c); loadChapters(c.id) }

  const addChapter = async () => {
    if (!newChTitle.trim()) return
    try { await api.courses.createChapter(contentCourse.id, { title: newChTitle }); setNewChTitle(''); loadChapters(contentCourse.id) }
    catch { showToast('Failed to add chapter') }
  }

  const deleteChapter = async (chId: string) => {
    if (!confirm('Delete chapter and all its lessons?')) return
    try { await api.courses.deleteChapter(contentCourse.id, chId); loadChapters(contentCourse.id) }
    catch { showToast('Failed to delete') }
  }

  const addLesson = async (chId: string) => {
    if (!newLesson.title.trim()) return
    try {
      await api.courses.createLesson(contentCourse.id, chId, { ...newLesson, durationMins: Number(newLesson.durationMins) })
      setAddingLesson(null)
      setNewLesson({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })
      loadChapters(contentCourse.id)
    } catch { showToast('Failed to add lesson') }
  }

  const deleteLesson = async (lId: string) => {
    try { await api.courses.deleteLesson(contentCourse.id, lId); loadChapters(contentCourse.id) }
    catch { showToast('Failed to delete lesson') }
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) {
        await api.courses.update(editing.id, form)
        setShowModal(false); load(); showToast('Course updated ✅')
      } else {
        const res = await api.courses.create(form)
        // After creating, open in edit mode on Curriculum tab so admin can add content
        const newCourse = res.data || res
        if (newCourse?.id) {
          setEditing(newCourse)
          setTab('curriculum')
          loadModalChapters(newCourse.id)
          showToast('Course created! Now add chapters and lessons below ✅')
          load()
        } else {
          setShowModal(false); load(); showToast('Course created ✅')
        }
      }
    } catch (e: any) { showToast(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this course?')) return
    try { await api.courses.delete(id); load(); showToast('Course deleted') }
    catch { showToast('Failed to delete') }
  }

  const openNew = () => { setEditing(null); setForm(EMPTY); setTab('details'); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      title: c.title, subject: c.subject, instructor: c.instructor||'',
      instructorBio: c.instructor_bio||'', instructorStudents: c.instructor_students||'',
      instructorCourses: c.instructor_courses||1, description: c.description||'',
      price: c.price, originalPrice: c.original_price, isPaid: c.is_paid,
      isFeatured: c.is_featured, totalHours: c.total_hours, totalLessons: c.total_lessons,
      examTags: c.exam_tags||[], language: c.language, status: c.status,
      whatYouLearn: c.what_you_learn||[], hasCertificate: c.has_certificate!==false,
    })
    setTab('details'); setShowModal(true)
  }

  const addLearnItem = () => {
    const v = newLearnItem.trim(); if (!v) return
    setForm((f: any) => ({ ...f, whatYouLearn: [...f.whatYouLearn, v] })); setNewLearnItem('')
  }
  const removeLearnItem = (i: number) =>
    setForm((f: any) => ({ ...f, whatYouLearn: f.whatYouLearn.filter((_: any, idx: number) => idx !== i) }))

  const lessonEmoji = (type: string) => ({ video:'🎬', quiz:'❓', live:'🔴', pdf:'📄' }[type] || '📄')

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <Header title="Courses & Content" subtitle="Manage courses, chapters, lessons and learning outcomes" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex gap-3 flex-wrap items-center">
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search courses…" className="input flex-1 min-w-[200px] max-w-sm" />
          <select value={status} onChange={e=>setStatus(e.target.value)} className="input w-36">
            <option value="">All Status</option>
            {['draft','published','review'].map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16}/> New Course</button>
        </div>

        {/* Course table */}
        {loading ? (
          <div className="card p-12 text-center text-slate-400">Loading…</div>
        ) : list.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-5xl mb-3 block">📚</span>
            <p className="font-semibold text-slate-800 mb-1">No courses found</p>
            <p className="text-sm text-slate-500 mb-4">Create your first course to get started</p>
            <button onClick={openNew} className="btn-primary">Create First Course</button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Title','Subject','Price','Rating','Lessons','Status','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((c:any) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate" title={c.title}>{c.title}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{c.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{c.is_paid ? `₹${c.price?.toLocaleString()}` : <span className="text-green-600 font-medium">Free</span>}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">⭐ {parseFloat(c.rating||0).toFixed(1)} <span className="text-slate-400 text-xs">({c.review_count})</span></span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.total_lessons}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(c.status)}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={()=>openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit size={14}/></button>
                        <button onClick={()=>openContent(c)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Manage chapters & lessons"><BookOpen size={14}/></button>
                        <button onClick={()=>remove(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Chapter/Lesson management panel */}
        {contentCourse && (
          <div className="card p-0 overflow-hidden border-2 border-purple-100">
            <div className="flex items-center justify-between p-4 bg-purple-50 border-b border-purple-100">
              <div>
                <p className="font-semibold text-slate-800">📚 {contentCourse.title}</p>
                <p className="text-xs text-slate-500">Manage chapters and lessons</p>
              </div>
              <button onClick={()=>setContentCourse(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>
            <div className="p-4 space-y-3">
              {loadingCh ? <div className="py-8 text-center text-slate-400">Loading chapters…</div> : (
                <>
                  {chapters.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">No chapters yet. Add the first one below.</p>}
                  {chapters.map((ch:any) => (
                    <div key={ch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 p-3 bg-white hover:bg-slate-50 cursor-pointer"
                        onClick={()=>setExpandedCh(expandedCh===ch.id?null:ch.id)}>
                        <GripVertical size={14} className="text-slate-300 flex-shrink-0"/>
                        {expandedCh===ch.id ? <ChevronDown size={15} className="text-slate-500"/> : <ChevronRight size={15} className="text-slate-400"/>}
                        <span className="font-semibold text-slate-700 flex-1 text-sm">{ch.title}</span>
                        <span className="text-xs text-slate-400 mr-2">{(ch.lessons||[]).length} lessons</span>
                        <button onClick={e=>{e.stopPropagation();deleteChapter(ch.id)}} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={12}/></button>
                      </div>
                      {expandedCh===ch.id && (
                        <div className="border-t border-slate-100">
                          {(ch.lessons||[]).map((l:any, idx:number) => (
                            <div key={l.id} className={`flex items-center gap-2 px-4 py-2.5 ${idx < (ch.lessons||[]).length-1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50`}>
                              <span className="text-sm">{lessonEmoji(l.type)}</span>
                              <span className="flex-1 text-sm text-slate-700">{l.title}</span>
                              <span className="text-xs text-slate-400">{l.duration_mins}min</span>
                              {l.is_free_preview && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Free</span>}
                              {l.notes_url && <a href={l.notes_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">PDF ↗</a>}
                              <button onClick={()=>deleteLesson(l.id)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={11}/></button>
                            </div>
                          ))}
                          {addingLesson===ch.id ? (
                            <div className="p-3 bg-blue-50/60 border-t border-blue-100 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input value={newLesson.title} onChange={e=>setNewLesson({...newLesson,title:e.target.value})}
                                  placeholder="Lesson title *" className="input col-span-2 text-sm"/>
                                <select value={newLesson.type} onChange={e=>setNewLesson({...newLesson,type:e.target.value})} className="input text-sm">
                                  <option value="pdf">📄 PDF</option>
                                  <option value="video">🎬 Video</option>
                                  <option value="quiz">❓ Quiz</option>
                                  <option value="live">🔴 Live</option>
                                </select>
                                <input type="number" value={newLesson.durationMins}
                                  onChange={e=>setNewLesson({...newLesson,durationMins:Number(e.target.value)})}
                                  placeholder="Duration (mins)" className="input text-sm"/>
                                <input value={newLesson.notesUrl} onChange={e=>setNewLesson({...newLesson,notesUrl:e.target.value})}
                                  placeholder="PDF / Notes URL" className="input col-span-2 text-sm"/>
                                <input value={newLesson.videoUrl} onChange={e=>setNewLesson({...newLesson,videoUrl:e.target.value})}
                                  placeholder="Video URL (optional)" className="input col-span-2 text-sm"/>
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                  <input type="checkbox" checked={newLesson.isFreePreview}
                                    onChange={e=>setNewLesson({...newLesson,isFreePreview:e.target.checked})} className="rounded"/>
                                  Free preview
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                  <input type="checkbox" checked={!newLesson.isLocked}
                                    onChange={e=>setNewLesson({...newLesson,isLocked:!e.target.checked})} className="rounded"/>
                                  Unlocked for enrolled users
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={()=>addLesson(ch.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Check size={12}/> Save Lesson</button>
                                <button onClick={()=>setAddingLesson(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setAddingLesson(ch.id)}
                              className="w-full py-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors">
                              <Plus size={12}/> Add Lesson
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input value={newChTitle} onChange={e=>setNewChTitle(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&addChapter()}
                      placeholder="Chapter title… (Enter to add)" className="input flex-1 text-sm"/>
                    <button onClick={addChapter} disabled={!newChTitle.trim()} className="btn-primary flex items-center gap-1 text-sm disabled:opacity-40">
                      <Plus size={14}/> Add Chapter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6 gap-4">
              {(['details','curriculum','ratings'] as Tab[]).map(t=>(
                <button key={t} onClick={()=>switchTab(t)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${tab===t?'border-blue-500 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {t === 'curriculum' ? '📋 Curriculum' : t === 'details' ? '📝 Details' : '⭐ Ratings'}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">

              {tab === 'details' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label">Title *</label>
                      <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input w-full" placeholder="Course title"/>
                    </div>
                    <div>
                      <label className="label">Subject *</label>
                      <DynamicSelect type="subjects" value={form.subject} onChange={v=>setForm({...form,subject:v})} placeholder="Select subject"/>
                      {/* Fallback: allow typing if dropdown has no matching option */}
                      <input
                        value={form.subject}
                        onChange={e=>setForm({...form,subject:e.target.value})}
                        placeholder="Or type subject name…"
                        className="input w-full mt-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input w-full">
                        {['draft','published','review'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Description</label>
                      <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                        rows={3} className="input w-full" placeholder="What is this course about?"/>
                    </div>
                    <div>
                      <label className="label">Instructor Name</label>
                      <input value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})} className="input w-full" placeholder="e.g. Dr. Meera Yadav"/>
                    </div>
                    <div>
                      <label className="label">Instructor Students (display)</label>
                      <input value={form.instructorStudents} onChange={e=>setForm({...form,instructorStudents:e.target.value})} className="input w-full" placeholder="e.g. 18K+"/>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Instructor Bio</label>
                      <textarea value={form.instructorBio} onChange={e=>setForm({...form,instructorBio:e.target.value})}
                        rows={2} className="input w-full" placeholder="Brief instructor bio"/>
                    </div>
                    <div>
                      <label className="label">Price (₹)</label>
                      <input type="number" value={form.price} onChange={e=>setForm({...form,price:+e.target.value})} className="input w-full"/>
                    </div>
                    <div>
                      <label className="label">Original Price (₹)</label>
                      <input type="number" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:+e.target.value})} className="input w-full"/>
                    </div>
                    <div>
                      <label className="label">Total Hours</label>
                      <input type="number" step="0.5" value={form.totalHours} onChange={e=>setForm({...form,totalHours:+e.target.value})} className="input w-full"/>
                    </div>
                    <div>
                      <label className="label">Language</label>
                      <input value={form.language} onChange={e=>setForm({...form,language:e.target.value})} className="input w-full"/>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isPaid} onChange={e=>setForm({...form,isPaid:e.target.checked})} className="rounded"/>
                        <span className="text-sm font-medium">Paid course</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.hasCertificate} onChange={e=>setForm({...form,hasCertificate:e.target.checked})} className="rounded"/>
                        <span className="text-sm font-medium">Certificate of completion</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})} className="rounded"/>
                        <span className="text-sm font-medium">Featured</span>
                      </label>
                    </div>
                  </div>

                  {/* What You'll Learn */}
                  <div>
                    <label className="label">What You'll Learn</label>
                    <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                      {form.whatYouLearn.map((item:string, i:number) => (
                        <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-1.5">
                          <span className="text-green-500 text-xs">✓</span>
                          <span className="text-sm flex-1 text-slate-700">{item}</span>
                          <button onClick={()=>removeLearnItem(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newLearnItem} onChange={e=>setNewLearnItem(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&addLearnItem()}
                        placeholder="Add learning outcome… press Enter" className="input flex-1 text-sm"/>
                      <button onClick={addLearnItem} className="btn-primary text-sm px-3 py-1.5 flex-shrink-0"><Plus size={14}/></button>
                    </div>
                  </div>
                </>
              )}

              {tab === 'curriculum' && (
                <div className="space-y-3 min-h-[300px]">
                  {!editing ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span className="text-4xl mb-3">💾</span>
                      <p className="font-semibold text-slate-700 mb-1">Save the course first</p>
                      <p className="text-sm text-slate-500">Fill in the Details tab and click <strong>Create Course</strong>. You'll land here automatically to add chapters and lessons.</p>
                    </div>
                  ) : modalLoadingCh ? (
                    <div className="py-10 text-center text-slate-400 text-sm">Loading chapters…</div>
                  ) : (
                    <>
                      {modalChapters.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                          <span className="text-3xl mb-2">📚</span>
                          <p className="font-medium text-slate-600 mb-1">No chapters yet</p>
                          <p className="text-xs text-slate-400">Type a chapter title below and press Enter</p>
                        </div>
                      )}

                      {/* Chapter list */}
                      {modalChapters.map((ch: any) => {
                        const isExpanded = modalExpandedCh === ch.id
                        const lessons = ch.lessons || []
                        return (
                          <div key={ch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* Chapter header */}
                            <div className="flex items-center gap-2 p-3 bg-white hover:bg-slate-50 cursor-pointer"
                              onClick={() => setModalExpandedCh(isExpanded ? null : ch.id)}>
                              {isExpanded
                                ? <ChevronDown size={15} className="text-slate-500 flex-shrink-0"/>
                                : <ChevronRight size={15} className="text-slate-400 flex-shrink-0"/>
                              }
                              <span className="font-semibold text-slate-700 flex-1 text-sm">{ch.title}</span>
                              <span className="text-xs text-slate-400 mr-2">{lessons.length} lessons</span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  if (!confirm('Delete this chapter and all its lessons?')) return
                                  api.courses.deleteChapter(editing.id, ch.id)
                                    .then(() => loadModalChapters(editing.id))
                                    .catch(() => showToast('Failed to delete chapter'))
                                }}
                                className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                              >
                                <Trash2 size={12}/>
                              </button>
                            </div>

                            {/* Lessons */}
                            {isExpanded && (
                              <div className="border-t border-slate-100">
                                {lessons.map((l: any, idx: number) => (
                                  <div key={l.id}
                                    className={`flex items-center gap-2 px-4 py-2.5 ${idx < lessons.length-1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50`}>
                                    <span className="text-sm">{({video:'🎬',quiz:'❓',live:'🔴',pdf:'📄'} as any)[l.type]||'📄'}</span>
                                    <span className="flex-1 text-sm text-slate-700">{l.title}</span>
                                    <span className="text-xs text-slate-400">{l.duration_mins}min</span>
                                    {l.is_free_preview && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Free</span>}
                                    {l.notes_url && <a href={l.notes_url} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline">PDF ↗</a>}
                                    <button type="button"
                                      onClick={() => api.courses.deleteLesson(editing.id, l.id)
                                        .then(() => loadModalChapters(editing.id))
                                        .catch(() => showToast('Failed to delete'))}
                                      className="p-1 text-red-400 hover:text-red-600 flex-shrink-0">
                                      <Trash2 size={11}/>
                                    </button>
                                  </div>
                                ))}

                                {/* Add lesson inline */}
                                {modalAddingLesson === ch.id ? (
                                  <div className="p-3 bg-blue-50/60 border-t border-blue-100 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input value={modalNewLesson.title}
                                        onChange={e => setModalNewLesson({...modalNewLesson, title: e.target.value})}
                                        placeholder="Lesson title *" className="input col-span-2 text-sm"/>
                                      <select value={modalNewLesson.type}
                                        onChange={e => setModalNewLesson({...modalNewLesson, type: e.target.value})}
                                        className="input text-sm">
                                        <option value="pdf">📄 PDF</option>
                                        <option value="video">🎬 Video</option>
                                        <option value="quiz">❓ Quiz</option>
                                        <option value="live">🔴 Live</option>
                                      </select>
                                      <input type="number" value={modalNewLesson.durationMins}
                                        onChange={e => setModalNewLesson({...modalNewLesson, durationMins: Number(e.target.value)})}
                                        placeholder="Duration (mins)" className="input text-sm"/>
                                      <input value={modalNewLesson.notesUrl}
                                        onChange={e => setModalNewLesson({...modalNewLesson, notesUrl: e.target.value})}
                                        placeholder="PDF / Notes URL" className="input col-span-2 text-sm"/>
                                      <input value={modalNewLesson.videoUrl}
                                        onChange={e => setModalNewLesson({...modalNewLesson, videoUrl: e.target.value})}
                                        placeholder="Video URL (optional)" className="input col-span-2 text-sm"/>
                                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="checkbox" checked={modalNewLesson.isFreePreview}
                                          onChange={e => setModalNewLesson({...modalNewLesson, isFreePreview: e.target.checked})} className="rounded"/>
                                        Free preview
                                      </label>
                                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                        <input type="checkbox" checked={!modalNewLesson.isLocked}
                                          onChange={e => setModalNewLesson({...modalNewLesson, isLocked: !e.target.checked})} className="rounded"/>
                                        Unlocked
                                      </label>
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="button"
                                        onClick={() => {
                                          if (!modalNewLesson.title.trim()) return
                                          api.courses.createLesson(editing.id, ch.id, {
                                            ...modalNewLesson, durationMins: Number(modalNewLesson.durationMins)
                                          })
                                          .then(() => {
                                            loadModalChapters(editing.id)
                                            setModalAddingLesson(null)
                                            setModalNewLesson({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })
                                          })
                                          .catch(() => showToast('Failed to add lesson'))
                                        }}
                                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                                        <Check size={12}/> Save Lesson
                                      </button>
                                      <button type="button" onClick={() => setModalAddingLesson(null)}
                                        className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button type="button"
                                    onClick={() => setModalAddingLesson(ch.id)}
                                    className="w-full py-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1 transition-colors">
                                    <Plus size={12}/> Add Lesson
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Add chapter row */}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={modalNewChTitle}
                          onChange={e => setModalNewChTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key !== 'Enter') return
                            e.preventDefault()
                            if (!modalNewChTitle.trim()) return
                            api.courses.createChapter(editing.id, { title: modalNewChTitle })
                              .then(() => { setModalNewChTitle(''); loadModalChapters(editing.id) })
                              .catch(() => showToast('Failed to add chapter'))
                          }}
                          placeholder="Chapter title… press Enter to add"
                          className="input flex-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={!modalNewChTitle.trim()}
                          onClick={() => {
                            if (!modalNewChTitle.trim()) return
                            api.courses.createChapter(editing.id, { title: modalNewChTitle })
                              .then(() => { setModalNewChTitle(''); loadModalChapters(editing.id) })
                              .catch(() => showToast('Failed to add chapter'))
                          }}
                          className="btn-primary flex items-center gap-1 text-sm disabled:opacity-40 flex-shrink-0"
                        >
                          <Plus size={14}/> Add Chapter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === 'ratings' && (
                <div className="space-y-3">
                  {editing ? (
                    <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="text-center">
                        <p className="text-4xl font-extrabold text-amber-500">{parseFloat(editing.rating||0).toFixed(1)}</p>
                        <div className="flex justify-center gap-0.5 my-1">
                          {Array.from({length:5},(_,i)=><span key={i} className="text-sm">{i<Math.round(editing.rating||0)?'⭐':'☆'}</span>)}
                        </div>
                        <p className="text-xs text-slate-500">{editing.review_count} reviews</p>
                      </div>
                      <p className="text-sm text-slate-600 flex-1">Ratings are submitted by enrolled students through the app after completing lessons. They update automatically in real time.</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-4">Save the course first to see ratings.</p>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving||!form.title.trim()} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
