'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, EmptyState, useToast } from '@/components/ui/feedback'
import { Plus, Edit, Trash2, RefreshCw, ChevronDown, ChevronRight, BookOpen, Video, FileText, X, Check, GripVertical } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

// ─────────────────────────────────────────────────────────────
// ADMIN COURSES PAGE — Full course management:
//  1. Course list with create/edit
//  2. "Content" tab per course: chapters + lessons
//  3. what_you_learn editable bullet list
//  4. instructor fields
//  5. Ratings overview per course
// ─────────────────────────────────────────────────────────────

const EMPTY_COURSE = {
  title:'', description:'', instructor:'', instructorBio:'', instructorStudents:'',
  instructorCourses:1, subject:'', price:0, originalPrice:0, isPaid:false,
  isFeatured:false, totalHours:0, bpscRelevance:0,
  language:'Hindi + English', examTags:['BPSC 70th CCE'], status:'draft',
  whatYouLearn:[] as string[], hasCertificate:true,
}

type Tab = 'details' | 'content' | 'ratings'

export default function CoursesPage() {
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>(EMPTY_COURSE)
  const [activeTab, setActiveTab] = useState<Tab>('details')
  // Content management state
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [expandedChapter, setExpandedChapter] = useState<string|null>(null)
  const [loadingChapters, setLoadingChapters] = useState(false)
  // New item inputs
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [addingLesson, setAddingLesson] = useState<string|null>(null) // chapterId
  const [newLesson, setNewLesson] = useState({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })
  // What you'll learn editor
  const [newLearnItem, setNewLearnItem] = useState('')

  const { showToast, ToastComponent } = useToast()
  const { data, loading, error, refetch } = useApiData<any>(() => api.courses.list({ search }), [search])
  const courses:any[] = data?.courses || []

  const { mutate: save, loading: saving } = useMutation(
    (d:any) => editing ? api.courses.update(editing.id, d) : api.courses.create(d),
    { onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Course updated ✅' : 'Course created ✅') },
      onError: (m) => showToast(m, 'error') }
  )
  const { mutate: remove } = useMutation(
    (id:string) => api.courses.delete(id),
    { onSuccess: () => { refetch(); showToast('Course deleted') }, onError: (m) => showToast(m,'error') }
  )

  // Load chapters when a course is selected for content editing
  const loadChapters = async (courseId: string) => {
    setLoadingChapters(true)
    try {
      const res = await api.courses.getChapters(courseId)
      setChapters(res.data?.chapters || [])
    } catch { showToast('Failed to load chapters','error') }
    finally { setLoadingChapters(false) }
  }

  const openContent = (course: any) => {
    setSelectedCourse(course)
    loadChapters(course.id)
  }

  const addChapter = async () => {
    if (!newChapterTitle.trim()) return
    try {
      await api.courses.createChapter(selectedCourse.id, { title: newChapterTitle })
      setNewChapterTitle('')
      loadChapters(selectedCourse.id)
    } catch { showToast('Failed to add chapter','error') }
  }

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Delete this chapter and all its lessons?')) return
    try {
      await api.courses.deleteChapter(selectedCourse.id, chapterId)
      loadChapters(selectedCourse.id)
    } catch { showToast('Failed to delete','error') }
  }

  const addLesson = async (chapterId: string) => {
    if (!newLesson.title.trim()) return
    try {
      await api.courses.createLesson(selectedCourse.id, chapterId, {
        title: newLesson.title, type: newLesson.type,
        durationMins: newLesson.durationMins,
        notesUrl: newLesson.notesUrl || undefined,
        videoUrl: newLesson.videoUrl || undefined,
        isFreePreview: newLesson.isFreePreview, isLocked: newLesson.isLocked
      })
      setAddingLesson(null)
      setNewLesson({ title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true })
      loadChapters(selectedCourse.id)
    } catch { showToast('Failed to add lesson','error') }
  }

  const deleteLesson = async (lessonId: string) => {
    try {
      await api.courses.deleteLesson(selectedCourse.id, lessonId)
      loadChapters(selectedCourse.id)
    } catch { showToast('Failed to delete lesson','error') }
  }

  const openNew = () => { setEditing(null); setForm(EMPTY_COURSE); setShowModal(true); setActiveTab('details') }
  const openEdit = (c:any) => {
    setEditing(c)
    setForm({
      title: c.title, description: c.description||'',
      instructor: c.instructor||'', instructorBio: c.instructor_bio||'',
      instructorStudents: c.instructor_students||'', instructorCourses: c.instructor_courses||1,
      subject: c.subject, price: c.price, originalPrice: c.original_price,
      isPaid: c.is_paid, isFeatured: c.is_featured,
      totalHours: c.total_hours, bpscRelevance: c.bpsc_relevance,
      language: c.language, examTags: c.exam_tags||[], status: c.status,
      whatYouLearn: c.what_you_learn||[], hasCertificate: c.has_certificate!==false,
    })
    setShowModal(true)
    setActiveTab('details')
  }

  const addLearnItem = () => {
    const v = newLearnItem.trim()
    if (!v) return
    setForm((f:any) => ({ ...f, whatYouLearn: [...f.whatYouLearn, v] }))
    setNewLearnItem('')
  }
  const removeLearnItem = (i:number) =>
    setForm((f:any) => ({ ...f, whatYouLearn: f.whatYouLearn.filter((_:any,idx:number) => idx!==i) }))

  const lessonTypeIcon = (type:string) => type==='video' ? '🎬' : type==='quiz' ? '❓' : type==='live' ? '🔴' : '📄'

  if (loading) return <PageLoader />
  if (error) return <ErrorMessage message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Courses" subtitle="Create and manage courses, chapters and lessons" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex gap-3 items-center">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses…" className="input flex-1 max-w-sm" />
          <button onClick={()=>refetch()} className="p-2 text-slate-500 hover:text-slate-700"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16}/> New Course</button>
        </div>

        {/* Course table */}
        {courses.length === 0 ? <EmptyState title="No courses" message="Create your first course" action={openNew} actionLabel="New Course" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {['Title','Subject','Price','Rating','Lessons','Status','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {courses.map((c:any) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{c.title}</td>
                  <td className="px-4 py-3 text-slate-600">{c.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{c.is_paid ? `₹${c.price}` : 'Free'}</td>
                  <td className="px-4 py-3">⭐ {parseFloat(c.rating||0).toFixed(1)} <span className="text-slate-400">({c.review_count})</span></td>
                  <td className="px-4 py-3 text-slate-600">{c.total_lessons}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.status==='published'?'bg-green-100 text-green-700':c.status==='draft'?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14}/></button>
                      <button onClick={()=>openContent(c)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Manage chapters/lessons"><BookOpen size={14}/></button>
                      <button onClick={()=>remove(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Content manager panel */}
        {selectedCourse && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800">{selectedCourse.title}</p>
                <p className="text-xs text-slate-500">Course content — chapters and lessons</p>
              </div>
              <button onClick={()=>setSelectedCourse(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>
            <div className="p-4 space-y-3">
              {loadingChapters ? <div className="py-8 text-center text-slate-400">Loading…</div> : (
                <>
                  {chapters.map(ch => (
                    <div key={ch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Chapter header */}
                      <div className="flex items-center gap-3 p-3 bg-white cursor-pointer hover:bg-slate-50"
                        onClick={()=>setExpandedChapter(expandedChapter===ch.id?null:ch.id)}>
                        <GripVertical size={14} className="text-slate-300"/>
                        {expandedChapter===ch.id ? <ChevronDown size={15} className="text-slate-500"/> : <ChevronRight size={15} className="text-slate-400"/>}
                        <span className="font-semibold text-slate-700 flex-1">{ch.title}</span>
                        <span className="text-xs text-slate-400">{(ch.lessons||[]).length} lessons</span>
                        <button onClick={e=>{e.stopPropagation();deleteChapter(ch.id)}} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                      </div>
                      {/* Lessons */}
                      {expandedChapter===ch.id && (
                        <div className="border-t border-slate-100">
                          {(ch.lessons||[]).map((l:any) => (
                            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50/50">
                              <span className="text-base">{lessonTypeIcon(l.type)}</span>
                              <span className="flex-1 text-sm text-slate-700">{l.title}</span>
                              <span className="text-xs text-slate-400">{l.duration_mins}min</span>
                              {l.is_free_preview && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Free</span>}
                              {l.notes_url && <a href={l.notes_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">PDF</a>}
                              <button onClick={()=>deleteLesson(l.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={11}/></button>
                            </div>
                          ))}
                          {/* Add lesson form */}
                          {addingLesson===ch.id ? (
                            <div className="p-3 bg-blue-50 border-t border-blue-100 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input value={newLesson.title} onChange={e=>setNewLesson({...newLesson,title:e.target.value})}
                                  placeholder="Lesson title *" className="input col-span-2 text-sm"/>
                                <select value={newLesson.type} onChange={e=>setNewLesson({...newLesson,type:e.target.value})} className="input text-sm">
                                  <option value="pdf">📄 PDF</option>
                                  <option value="video">🎬 Video</option>
                                  <option value="quiz">❓ Quiz</option>
                                  <option value="live">🔴 Live</option>
                                </select>
                                <input type="number" value={newLesson.durationMins} onChange={e=>setNewLesson({...newLesson,durationMins:+e.target.value})}
                                  placeholder="Duration (mins)" className="input text-sm"/>
                                <input value={newLesson.notesUrl} onChange={e=>setNewLesson({...newLesson,notesUrl:e.target.value})}
                                  placeholder="PDF / Notes URL" className="input col-span-2 text-sm"/>
                                <input value={newLesson.videoUrl} onChange={e=>setNewLesson({...newLesson,videoUrl:e.target.value})}
                                  placeholder="Video URL (optional)" className="input col-span-2 text-sm"/>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                  <input type="checkbox" checked={newLesson.isFreePreview} onChange={e=>setNewLesson({...newLesson,isFreePreview:e.target.checked})}/>
                                  Free preview
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                  <input type="checkbox" checked={!newLesson.isLocked} onChange={e=>setNewLesson({...newLesson,isLocked:!e.target.checked})}/>
                                  Unlocked
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={()=>addLesson(ch.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Check size={12}/> Add Lesson</button>
                                <button onClick={()=>setAddingLesson(null)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setAddingLesson(ch.id)}
                              className="w-full py-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1">
                              <Plus size={12}/> Add Lesson
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add chapter */}
                  <div className="flex gap-2">
                    <input value={newChapterTitle} onChange={e=>setNewChapterTitle(e.target.value)}
                      onKeyDown={e=>e.key==='Enter' && addChapter()}
                      placeholder="New chapter title…" className="input flex-1 text-sm"/>
                    <button onClick={addChapter} className="btn-primary flex items-center gap-1 text-sm"><Plus size={14}/> Add Chapter</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Course create/edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold">{editing ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b px-6 gap-4">
              {(['details','content','ratings'] as Tab[]).map(tab => (
                <button key={tab} onClick={()=>setActiveTab(tab)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab===tab?'border-blue-500 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">
              {activeTab === 'details' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="label">Title *</label>
                      <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input w-full" placeholder="Course title"/>
                    </div>
                    <div>
                      <label className="label">Subject</label>
                      <DynamicSelect type="subjects" value={form.subject} onChange={v=>setForm({...form,subject:v})} placeholder="Select subject"/>
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
                        rows={3} className="input w-full" placeholder="Course description"/>
                    </div>
                    <div><label className="label">Instructor Name</label>
                      <input value={form.instructor} onChange={e=>setForm({...form,instructor:e.target.value})} className="input w-full"/></div>
                    <div><label className="label">Instructor Students (e.g. 18K+)</label>
                      <input value={form.instructorStudents} onChange={e=>setForm({...form,instructorStudents:e.target.value})} className="input w-full"/></div>
                    <div className="col-span-2"><label className="label">Instructor Bio</label>
                      <textarea value={form.instructorBio} onChange={e=>setForm({...form,instructorBio:e.target.value})}
                        rows={2} className="input w-full" placeholder="Brief instructor bio"/></div>
                    <div><label className="label">Price (₹)</label>
                      <input type="number" value={form.price} onChange={e=>setForm({...form,price:+e.target.value})} className="input w-full"/></div>
                    <div><label className="label">Original Price (₹)</label>
                      <input type="number" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:+e.target.value})} className="input w-full"/></div>
                    <div><label className="label">Total Hours</label>
                      <input type="number" step="0.5" value={form.totalHours} onChange={e=>setForm({...form,totalHours:+e.target.value})} className="input w-full"/></div>
                    <div><label className="label">Language</label>
                      <input value={form.language} onChange={e=>setForm({...form,language:e.target.value})} className="input w-full"/></div>
                    <label className="flex items-center gap-3 col-span-1 cursor-pointer">
                      <input type="checkbox" checked={form.isPaid} onChange={e=>setForm({...form,isPaid:e.target.checked})} className="w-4 h-4 rounded"/>
                      <span className="text-sm font-medium">Paid course</span>
                    </label>
                    <label className="flex items-center gap-3 col-span-1 cursor-pointer">
                      <input type="checkbox" checked={form.hasCertificate} onChange={e=>setForm({...form,hasCertificate:e.target.checked})} className="w-4 h-4 rounded"/>
                      <span className="text-sm font-medium">Certificate of completion</span>
                    </label>
                    <label className="flex items-center gap-3 col-span-1 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})} className="w-4 h-4 rounded"/>
                      <span className="text-sm font-medium">Featured</span>
                    </label>
                  </div>

                  {/* What You'll Learn */}
                  <div>
                    <label className="label">What You'll Learn</label>
                    <div className="space-y-1.5 mb-2">
                      {form.whatYouLearn.map((item:string, i:number) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                          <span className="text-green-500 text-xs">✓</span>
                          <span className="text-sm flex-1 text-slate-700">{item}</span>
                          <button onClick={()=>removeLearnItem(i)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newLearnItem} onChange={e=>setNewLearnItem(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&addLearnItem()}
                        placeholder="Add a learning outcome… (press Enter)" className="input flex-1 text-sm"/>
                      <button onClick={addLearnItem} className="btn-primary text-sm px-3 py-1.5"><Plus size={14}/></button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'content' && (
                <div className="space-y-2">
                  {!editing ? (
                    <p className="text-slate-500 text-sm text-center py-8">Save the course first, then add chapters and lessons using the 📖 button in the table.</p>
                  ) : (
                    <p className="text-slate-500 text-sm">Use the 📖 icon in the course table to manage chapters and lessons for this course.</p>
                  )}
                </div>
              )}

              {activeTab === 'ratings' && editing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="text-center">
                      <p className="text-4xl font-extrabold text-amber-600">{parseFloat(editing.rating||0).toFixed(1)}</p>
                      <div className="flex">{Array.from({length:5},(_,i)=><span key={i}>{i<Math.round(editing.rating||0)?'⭐':'☆'}</span>)}</div>
                      <p className="text-xs text-slate-500">{editing.review_count} reviews</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">Ratings are submitted by students through the Android app after completing lessons. They appear here automatically as they come in.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Rating distribution and individual reviews are visible on the course detail screen in the app.</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end">
              <button onClick={()=>setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={()=>save(form)} disabled={saving||!form.title||!form.subject} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
