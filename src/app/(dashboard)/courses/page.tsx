'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  Search, Plus, Edit, Trash2, BookOpen, RefreshCw, X, Check,
  ChevronDown, ChevronRight, GripVertical, Star, Users, Clock,
  Globe, Award, Tag, Eye, EyeOff, Layers, Video, FileText,
  AlertTriangle, CheckCircle, BookMarked, Zap, Crown, ChevronsLeft,ChevronLeft,ChevronsRight,
} from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

const EMPTY = {
  title:'', subject:'', instructor:'', instructorBio:'', instructorStudents:'',
  instructorCourses:1, description:'', price:0, originalPrice:0, isPaid:false,
  isFeatured:false, totalHours:0, language:'Hindi + English', status:'draft',
  whatYouLearn:[] as string[], hasCertificate:true,
}

const LESSON_TYPES = [
  { value:'pdf',   icon:'📄', label:'PDF / Notes' },
  { value:'video', icon:'🎬', label:'Video' },
  { value:'quiz',  icon:'❓', label:'Quiz' },
  { value:'live',  icon:'🔴', label:'Live Class' },
]

const EMPTY_LESSON = { title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true }

function lessonIcon(type: string) {
  return LESSON_TYPES.find(t => t.value === type)?.icon || '📄'
}

export default function ContentPage() {
  const { showToast, ToastComponent } = useToast()

  // List state
  const [list, setList]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')

  // Issue 5: chapters panel in a separate side-drawer / scrolled-to section
  const [contentCourse, setContentCourse] = useState<any>(null)
  const [chapters, setChapters]     = useState<any[]>([])
  const [loadingCh, setLoadingCh]   = useState(false)
  const [expandedCh, setExpandedCh] = useState<string|null>(null)
  const [newChTitle, setNewChTitle] = useState('')
  const [addingLesson, setAddingLesson] = useState<string|null>(null)
  const [newLesson, setNewLesson]   = useState<any>(EMPTY_LESSON)
  const [editingLesson, setEditingLesson] = useState<string|null>(null)
  const [editLessonData, setEditLessonData] = useState<any>(EMPTY_LESSON)
  const [editingChapter, setEditingChapter] = useState<string|null>(null)
  const [editChapterTitle, setEditChapterTitle] = useState('')
  const chapterRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [newLearnItem, setNewLearnItem] = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const LIMIT = 12

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.courses.list({ search, status, page, limit: 12 })
      setList(res.data?.courses || [])
      setTotal(res.meta?.total ?? res.data?.total ?? res.data?.courses?.length ?? 0)
    } catch (e: any) { showToast(e.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }, [search, status, page])

  useEffect(() => { setPage(1) }, [search, status])
  useEffect(() => { load() }, [load])

  // Issue 5: scroll to chapter panel automatically
  const openContent = (c: any) => {
    setContentCourse(c)
    loadChapters(c.id)
    setTimeout(() => chapterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const loadChapters = async (courseId: string) => {
    setLoadingCh(true)
    try {
      const res = await api.courses.getChapters(courseId)
      const chs = res.data?.chapters || []
      setChapters(chs)
      // Update lesson count on card from real chapter data
      const realTotal = chs.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0)
      setList(prev => prev.map(course =>
        course.id === courseId ? { ...course, total_lessons: realTotal } : course
      ))
    } catch { showToast('Failed to load chapters', 'error') }
    finally { setLoadingCh(false) }
  }

  const addChapter = async () => {
    if (!newChTitle.trim() || !contentCourse) return
    try {
      await api.courses.createChapter(contentCourse.id, { title: newChTitle })
      setNewChTitle('')
      loadChapters(contentCourse.id)
    } catch { showToast('Failed to add chapter', 'error') }
  }

  const deleteChapter = async (chId: string) => {
    if (!confirm('Delete this chapter and all its lessons?')) return
    try { await api.courses.deleteChapter(contentCourse.id, chId); loadChapters(contentCourse.id) }
    catch { showToast('Failed to delete', 'error') }
  }

  const addLesson = async (chId: string) => {
    if (!newLesson.title.trim()) return
    try {
      await api.courses.createLesson(contentCourse.id, chId, { ...newLesson, durationMins: Number(newLesson.durationMins) })
      setAddingLesson(null)
      setNewLesson(EMPTY_LESSON)
      loadChapters(contentCourse.id)
      showToast('Lesson added ✅')
    } catch { showToast('Failed to add lesson', 'error') }
  }

  const deleteLesson = async (lId: string) => {
    if (!confirm('Delete this lesson?')) return
    try { await api.courses.deleteLesson(contentCourse.id, lId); loadChapters(contentCourse.id) }
    catch { showToast('Failed to delete lesson', 'error') }
  }

  const updateLesson = async (lId: string) => {
    if (!editLessonData.title?.trim()) return
    try {
      await api.courses.updateLesson(contentCourse.id, lId, {
        ...editLessonData, durationMins: Number(editLessonData.durationMins)
      })
      setEditingLesson(null)
      loadChapters(contentCourse.id)
      showToast('Lesson updated ✅')
    } catch (e: any) { showToast(e.message || 'Failed to update', 'error') }
  }

  const updateChapterTitle = async (chId: string) => {
    if (!editChapterTitle.trim()) return
    try {
      await api.courses.updateChapter(contentCourse.id, chId, { title: editChapterTitle })
      setEditingChapter(null)
      loadChapters(contentCourse.id)
      showToast('Chapter renamed ✅')
    } catch (e: any) { showToast(e.message || 'Failed to update chapter', 'error') }
  }

  // Issue 6: delete with optimistic UI — remove from list immediately
  const remove = async (id: string) => {
    if (!confirm('Permanently delete this course? This cannot be undone.')) return
    setList(prev => prev.filter(c => c.id !== id))  // optimistic remove
    try {
      await api.courses.delete(id)
      showToast('Course deleted ✅')
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error')
      load()  // revert on failure
    }
  }

  const save = async () => {
    if (!form.title.trim())    { showToast('Title is required', 'error'); return }
    if (!form.subject.trim())  { showToast('Subject is required', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.courses.update(editing.id, form)
        setShowModal(false); load(); showToast('Course updated ✅')
      } else {
        const res = await api.courses.create(form)
        const newCourse = res.data || res
        setShowModal(false)
        load()
        showToast('Course created ✅')
        // Auto-open chapter manager for new course
        if (newCourse?.id) {
          setTimeout(() => openContent(newCourse), 400)
        }
      }
    } catch (e: any) { showToast(e.message || 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      title: c.title, subject: c.subject, instructor: c.instructor || '',
      instructorBio: c.instructor_bio || '', instructorStudents: c.instructor_students || '',
      instructorCourses: c.instructor_courses || 1, description: c.description || '',
      price: c.price, originalPrice: c.original_price, isPaid: c.is_paid,
      isFeatured: c.is_featured, totalHours: c.total_hours,
      language: c.language, status: c.status,
      whatYouLearn: c.what_you_learn || [], hasCertificate: c.has_certificate !== false,
    })
    setShowModal(true)
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Courses" subtitle="Create and manage your learning catalogue" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Filters bar ───────────────────────────────────── */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search courses…" className="input pl-9" />
          </div>
          {/* Issue 1: styled select with padding */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Layers size={13} className="text-slate-400" />
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="">All Status</option>
              {['draft','published','review'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2" title="Refresh"><RefreshCw size={13} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> New Course</button>
        </div>

        {/* ── Course grid ───────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card p-16 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-slate-800 text-lg mb-1">No courses yet</p>
            <p className="text-sm text-slate-400 mb-5">Create your first course to get started</p>
            <button onClick={openNew} className="btn-primary mx-auto"><Plus size={14}/> Create First Course</button>
          </div>
        ) : (
          /* Issue 4: Card-based grid instead of table */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((c: any) => (
              <div key={c.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">

                {/* Color header band */}
                <div className={`h-1.5 w-full ${
                  c.status === 'published' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  c.status === 'review'    ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  'bg-gradient-to-r from-slate-300 to-slate-400'
                }`} />

                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Top: title + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${c.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' :
                            c.status === 'review'    ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {c.status === 'published' ? <CheckCircle size={8}/> : <AlertTriangle size={8}/>}
                          {c.status}
                        </span>
                        {c.is_featured && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            <Crown size={8}/> Featured
                          </span>
                        )}
                        {c.is_paid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            ₹{c.price?.toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            Free
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{c.title}</h3>
                    </div>
                  </div>

                  {/* Instructor + subject */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.instructor && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users size={11} className="text-slate-400" /> {c.instructor}
                      </span>
                    )}
                    {c.subject && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Tag size={11} className="text-slate-400" /> {c.subject}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { icon: <BookMarked size={11}/>, label: 'Lessons',  value: c.total_lessons || 0 },
                      { icon: <Clock size={11}/>,      label: 'Hours',    value: `${c.total_hours || 0}h` },
                      { icon: <Users size={11}/>,      label: 'Enrolled', value: c.enrollment_count || 0 },
                      { icon: <Globe size={11}/>, label: 'Language', value: (c.language||'—').split(' ')[0] },
                      { icon: <Layers size={11}/>, label: 'Chapters', value: c.total_chapters || (c.chapters_count) || 0 },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col items-center py-2 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 mb-0.5">{s.icon}</span>
                        <span className="text-sm font-bold text-slate-800">{s.value}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Issue 3: Rating only shown if course has reviews */}
                  {c.review_count > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{parseFloat(c.rating||0).toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({c.review_count} reviews)</span>
                    </div>
                  )}

                  {/* spacer */}
                  <div className="flex-1" />

                  {/* Issue 5: Actions — full-width labelled buttons */}
                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                    >
                      <Edit size={12} /> Edit
                    </button>
                    <button
                      onClick={() => openContent(c)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors"
                    >
                      <BookOpen size={12} /> Chapters
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      title="Delete course"
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{Math.min((page-1)*LIMIT+1, total)}</span>–<span className="font-semibold text-slate-700">{Math.min(page*LIMIT, total)}</span> of <span className="font-semibold text-slate-700">{total}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronsLeft size={14}/></button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronLeft size={14}/></button>
              {Array.from({length: Math.min(Math.ceil(total/LIMIT), 7)}, (_,i)=>{
                const totalPgs = Math.ceil(total/LIMIT)
                const p = totalPgs<=7 ? i+1 : page<=4 ? i+1 : page>=totalPgs-3 ? totalPgs-6+i : page-3+i
                return <button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>
              })}
              <button disabled={page>=Math.ceil(total/LIMIT)} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronRight size={14}/></button>
              <button disabled={page>=Math.ceil(total/LIMIT)} onClick={()=>setPage(Math.ceil(total/LIMIT))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronsRight size={14}/></button>
            </div>
          </div>
        )}

        {/* ── Issue 5: Chapter panel — auto-scroll target with sticky header ── */}
        {contentCourse && (
          <div ref={chapterRef} className="card overflow-hidden border-2 border-purple-100 scroll-mt-6">
            {/* Sticky panel header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Layers size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm">{contentCourse.title}</p>
                  <p className="text-purple-200 text-xs">{chapters.length} chapter{chapters.length !== 1 ? 's' : ''} · click a chapter to expand</p>
                </div>
              </div>
              <button onClick={() => setContentCourse(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {loadingCh ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  {chapters.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <Layers size={32} className="mx-auto mb-3 text-slate-200" />
                      <p className="font-semibold text-slate-500 mb-1">No chapters yet</p>
                      <p className="text-xs text-slate-400">Add the first chapter below</p>
                    </div>
                  )}

                  {chapters.map((ch: any, chIdx: number) => (
                    <div key={ch.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      {/* Chapter header */}
                      {editingChapter === ch.id ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
                          <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-black shrink-0">{chIdx + 1}</div>
                          <input value={editChapterTitle} onChange={e => setEditChapterTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && updateChapterTitle(ch.id)}
                            className="input flex-1 text-sm py-1.5" autoFocus />
                          <button onClick={() => updateChapterTitle(ch.id)}
                            className="w-7 h-7 rounded-lg bg-green-500 hover:bg-green-600 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-white" />
                          </button>
                          <button onClick={() => setEditingChapter(null)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0">
                            <X size={12} className="text-slate-500" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedCh(expandedCh === ch.id ? null : ch.id)}
                        >
                          <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-black shrink-0">
                            {chIdx + 1}
                          </div>
                          {expandedCh === ch.id
                            ? <ChevronDown size={15} className="text-slate-500 shrink-0" />
                            : <ChevronRight size={15} className="text-slate-400 shrink-0" />}
                          <span className="font-semibold text-slate-800 flex-1 text-sm">{ch.title}</span>
                          <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">
                            {(ch.lessons || []).length} lessons
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingChapter(ch.id); setEditChapterTitle(ch.title) }}
                            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors shrink-0"
                            title="Rename chapter"
                          >
                            <Edit size={11} className="text-amber-600" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteChapter(ch.id) }}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        </div>
                      )}

                      {expandedCh === ch.id && (
                        <div className="border-t border-slate-100">
                          {(ch.lessons || []).map((l: any, idx: number) => (
                            <div key={l.id}
                              className={`${idx < (ch.lessons||[]).length - 1 ? 'border-b border-slate-50' : ''}`}
                            >
                              {editingLesson === l.id ? (
                                /* ── Inline edit form ── */
                                <div className="p-4 bg-blue-50/60 space-y-3">
                                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Edit Lesson</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input value={editLessonData.title}
                                      onChange={e => setEditLessonData({...editLessonData, title: e.target.value})}
                                      className="input col-span-2 text-sm" placeholder="Lesson title" autoFocus />
                                    <select value={editLessonData.type}
                                      onChange={e => setEditLessonData({...editLessonData, type: e.target.value})}
                                      className="input text-sm">
                                      {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                    </select>
                                    <input type="number" value={editLessonData.durationMins}
                                      onChange={e => setEditLessonData({...editLessonData, durationMins: Number(e.target.value)})}
                                      placeholder="Duration (mins)" className="input text-sm" />
                                    <input value={editLessonData.notesUrl}
                                      onChange={e => setEditLessonData({...editLessonData, notesUrl: e.target.value})}
                                      placeholder="PDF / Notes URL" className="input col-span-2 text-sm" />
                                    <input value={editLessonData.videoUrl}
                                      onChange={e => setEditLessonData({...editLessonData, videoUrl: e.target.value})}
                                      placeholder="Video URL" className="input col-span-2 text-sm" />
                                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer col-span-2">
                                      <input type="checkbox" checked={editLessonData.isFreePreview}
                                        onChange={e => setEditLessonData({...editLessonData, isFreePreview: e.target.checked})} className="rounded" />
                                      Free preview
                                    </label>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => updateLesson(l.id)} className="btn-primary text-xs py-1.5 px-3">
                                      <Check size={12} /> Save
                                    </button>
                                    <button onClick={() => { setEditingLesson(null); setEditLessonData(EMPTY_LESSON) }}
                                      className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                /* ── Normal lesson row ── */
                                <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                                  <span className="text-base shrink-0">{lessonIcon(l.type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{l.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {l.duration_mins > 0 && <span className="text-[10px] text-slate-400">{l.duration_mins}min</span>}
                                      {l.is_free_preview && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-medium">Free preview</span>}
                                      {l.notes_url && <a href={l.notes_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">PDF ↗</a>}
                                    </div>
                                  </div>
                                  {/* ✏️ Edit lesson button */}
                                  <button
                                    onClick={() => {
                                      setEditingLesson(l.id)
                                      setEditLessonData({
                                        title: l.title, type: l.type || 'pdf',
                                        durationMins: l.duration_mins || 0,
                                        notesUrl: l.notes_url || '',
                                        videoUrl: l.video_url || '',
                                        isFreePreview: l.is_free_preview || false,
                                        isLocked: l.is_locked !== false,
                                      })
                                    }}
                                    className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors"
                                    title="Edit lesson"
                                  >
                                    <Edit size={11} className="text-blue-500" />
                                  </button>
                                  <button onClick={() => deleteLesson(l.id)}
                                    className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                                    <Trash2 size={11} className="text-red-400" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Add lesson form */}
                          {addingLesson === ch.id ? (
                            <div className="p-4 bg-blue-50/50 border-t border-blue-100 space-y-3">
                              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">New Lesson</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                                  placeholder="Lesson title *" className="input col-span-2 text-sm" autoFocus />
                                <select value={newLesson.type} onChange={e => setNewLesson({...newLesson, type: e.target.value})} className="input text-sm">
                                  {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                </select>
                                <input type="number" value={newLesson.durationMins}
                                  onChange={e => setNewLesson({...newLesson, durationMins: Number(e.target.value)})}
                                  placeholder="Duration (mins)" className="input text-sm" />
                                <input value={newLesson.notesUrl} onChange={e => setNewLesson({...newLesson, notesUrl: e.target.value})}
                                  placeholder="PDF / Notes URL" className="input col-span-2 text-sm" />
                                <input value={newLesson.videoUrl} onChange={e => setNewLesson({...newLesson, videoUrl: e.target.value})}
                                  placeholder="Video URL (optional)" className="input col-span-2 text-sm" />
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer col-span-2">
                                  <input type="checkbox" checked={newLesson.isFreePreview}
                                    onChange={e => setNewLesson({...newLesson, isFreePreview: e.target.checked})} className="rounded" />
                                  Free preview (visible to non-enrolled users)
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => addLesson(ch.id)} className="btn-primary text-xs py-2 px-4">
                                  <Check size={12} /> Save Lesson
                                </button>
                                <button onClick={() => { setAddingLesson(null); setNewLesson(EMPTY_LESSON) }} className="btn-secondary text-xs py-2 px-4">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setAddingLesson(ch.id)}
                              className="w-full py-2.5 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 flex items-center justify-center gap-1.5 transition-colors font-semibold border-t border-slate-50">
                              <Plus size={13} /> Add Lesson
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add chapter */}
                  <div className="flex gap-2 pt-1">
                    <input value={newChTitle} onChange={e => setNewChTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChapter()}
                      placeholder="Chapter title… press Enter to add" className="input flex-1 text-sm" />
                    <button onClick={addChapter} disabled={!newChTitle.trim()}
                      className="btn-primary text-sm disabled:opacity-40 shrink-0">
                      <Plus size={14} /> Add Chapter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          Issue 2: New Course Modal — clean, sectioned UI
      ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">

            {/* Modal header */}
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 rounded-t-3xl flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  {editing ? <Edit size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg leading-none">{editing ? 'Edit Course' : 'New Course'}</h2>
                  <p className="text-white/60 text-xs mt-1">{editing ? 'Update course details' : 'Fill in the details to create a new course'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* Section 1: Basic Info */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-black">1</div>
                  <h3 className="font-bold text-slate-800">Basic Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Course Title *</label>
                    <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                      className="input w-full" placeholder="e.g. BPSC Prelims Complete Polity 2025" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Subject *</label>
                    <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                      className="input w-full" placeholder="e.g. Polity, History…" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Language</label>
                    <input value={form.language} onChange={e => setForm({...form, language: e.target.value})}
                      className="input w-full" placeholder="Hindi + English" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                      rows={3} className="input w-full resize-none" placeholder="What will students learn? Who is this course for?" />
                  </div>
                </div>
              </section>

              {/* Section 2: Instructor */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-black">2</div>
                  <h3 className="font-bold text-slate-800">Instructor</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Instructor Name</label>
                    <input value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})}
                      className="input w-full" placeholder="Dr. Meera Yadav" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Students (display)</label>
                    <input value={form.instructorStudents} onChange={e => setForm({...form, instructorStudents: e.target.value})}
                      className="input w-full" placeholder="e.g. 18K+" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Instructor Bio</label>
                    <textarea value={form.instructorBio} onChange={e => setForm({...form, instructorBio: e.target.value})}
                      rows={2} className="input w-full resize-none" placeholder="Brief instructor background and credentials" />
                  </div>
                </div>
              </section>

              {/* Section 3: Pricing */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-xs font-black">3</div>
                  <h3 className="font-bold text-slate-800">Pricing & Duration</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Paid toggle */}
                  <div className="col-span-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors
                      border-slate-200 hover:border-brand-300"
                      onClick={() => setForm({...form, isPaid: !form.isPaid})}>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isPaid ? 'bg-brand-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPaid ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{form.isPaid ? 'Paid Course' : 'Free Course'}</p>
                        <p className="text-xs text-slate-400">{form.isPaid ? 'Students pay to enroll' : 'Open to all users for free'}</p>
                      </div>
                    </label>
                  </div>
                  {form.isPaid && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Sale Price (₹) *</label>
                        <input type="number" value={form.price} onChange={e => setForm({...form, price: +e.target.value})}
                          className="input w-full" placeholder="999" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Original Price (₹)</label>
                        <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: +e.target.value})}
                          className="input w-full" placeholder="1999" />
                        <p className="text-[10px] text-slate-400 mt-1">Shown as strikethrough</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Total Hours</label>
                    <input type="number" step="0.5" value={form.totalHours} onChange={e => setForm({...form, totalHours: +e.target.value})}
                      className="input w-full" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input w-full">
                      <option value="draft">Draft — not visible</option>
                      <option value="review">Under Review</option>
                      <option value="published">Published — live</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Section 4: Options */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-black">4</div>
                  <h3 className="font-bold text-slate-800">Options</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'isFeatured',    icon: <Crown size={14}/>,  label: 'Featured',    desc: 'Show on home screen' },
                    { key: 'hasCertificate',icon: <Award size={14}/>,  label: 'Certificate', desc: 'On course completion' },
                  ].map(opt => (
                    <label key={opt.key}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                        ${form[opt.key] ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
                      onClick={() => setForm({...form, [opt.key]: !form[opt.key]})}>
                      <div className={`w-9 h-5 rounded-full transition-colors relative ${form[opt.key] ? 'bg-brand-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[opt.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <div className={`${opt.key === 'isFeatured' ? 'text-amber-600' : 'text-green-600'}`}>{opt.icon}</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Section 5: What You'll Learn */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-black">5</div>
                  <h3 className="font-bold text-slate-800">What Students Will Learn</h3>
                </div>
                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                  {form.whatYouLearn.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-teal-50 rounded-xl border border-teal-100">
                      <CheckCircle size={13} className="text-teal-500 shrink-0" />
                      <span className="text-sm flex-1 text-slate-700">{item}</span>
                      <button onClick={() => setForm((f:any) => ({...f, whatYouLearn: f.whatYouLearn.filter((_:any,idx:number)=>idx!==i)}))}
                        className="text-slate-300 hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {form.whatYouLearn.length === 0 && (
                    <p className="text-xs text-slate-400 italic px-1">No learning outcomes yet — add some below</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input value={newLearnItem}
                    onChange={e => setNewLearnItem(e.target.value)}
                    onKeyDown={e => { if (e.key !== 'Enter') return; const v = newLearnItem.trim(); if (!v) return; setForm((f:any) => ({...f, whatYouLearn:[...f.whatYouLearn,v]})); setNewLearnItem('') }}
                    placeholder="e.g. Understand Fundamental Rights… press Enter" className="input flex-1 text-sm" />
                  <button onClick={() => { const v = newLearnItem.trim(); if (!v) return; setForm((f:any)=>({...f,whatYouLearn:[...f.whatYouLearn,v]})); setNewLearnItem('') }}
                    className="btn-primary text-sm px-3 py-2 shrink-0"><Plus size={14}/></button>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.subject.trim()}
                className="btn-primary disabled:opacity-40">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : editing ? 'Save Changes' : 'Create Course →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
