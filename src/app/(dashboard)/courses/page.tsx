'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import {
  Search, Plus, Edit, Trash2, BookOpen, RefreshCw, X, Check,
  ChevronDown, ChevronRight, GripVertical, Star, Users, Clock,
  Globe, Award, Tag, Eye, EyeOff, Layers, Video, FileText,
  AlertTriangle, CheckCircle, BookMarked, Zap, Crown, ChevronsLeft, ChevronLeft, ChevronsRight,
  Lock, ShieldCheck, Upload, File, ExternalLink,
} from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

const EMPTY = {
  title:'', subject:'', instructor:'', instructorBio:'', instructorStudents:'',
  instructorCourses:1, description:'', price:0, originalPrice:0, isPaid:false,
  isFeatured:false, totalHours:0, language:'Hindi + English', status:'draft',
  whatYouLearn:[] as string[], hasCertificate:true, maxCoinsRedeemable: null as number | null,
  examTags:[] as string[],
}

const LESSON_TYPES = [
  { value:'pdf',   icon:'📄', label:'PDF / Notes' },
  { value:'video', icon:'🎬', label:'Video' },
  { value:'quiz',  icon:'❓', label:'Quiz' },
  { value:'live',  icon:'🔴', label:'Live Class' },
]

const EMPTY_LESSON = { title:'', type:'pdf', durationMins:0, notesUrl:'', videoUrl:'', isFreePreview:false, isLocked:true }

// ─── File size limits ─────────────────────────────────────────
const PDF_LIMIT_MB  = 50
const VIDEO_LIMIT_MB = 500

// ─── Reusable file upload field ───────────────────────────────
function FileUploadField({
  label, accept, limitMb, existingUrl, onChange, disabled, courseId,
}: {
  label: string
  accept: string
  limitMb: number
  existingUrl: string
  onChange: (url: string) => void
  disabled?: boolean
  courseId?: string
}) {
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [localUrl, setLocalUrl] = useState(existingUrl)
  const inputRef = useRef<HTMLInputElement>(null)
  // Keep localUrl in sync if parent resets the form
  useEffect(() => { setLocalUrl(existingUrl) }, [existingUrl])

  const isPdf = accept.includes('pdf')
  const icon  = isPdf ? <FileText size={14} className="shrink-0" /> : <Video size={14} className="shrink-0" />
  const color = isPdf ? 'blue' : 'purple'

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > limitMb) {
      alert(`File too large (${sizeMb.toFixed(1)} MB). Maximum allowed: ${limitMb} MB.`)
      e.target.value = ''
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      // courseId not needed for the file itself; pass placeholder — server ignores it
      const result = await (api.courses as any).uploadLessonFile(courseId || 'default', file, setProgress)
      const url = result?.fileUrl ?? result?.data?.fileUrl ?? ''
      setLocalUrl(url)
      onChange(url)
    } catch (err: any) {
      alert(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(null)
      e.target.value = ''
    }
  }

  return (
    <div className="col-span-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold text-${color}-700 flex items-center gap-1.5`}>
          {icon} {label}
        </label>
        <span className="text-[10px] text-slate-400">Max {limitMb} MB</span>
      </div>

      {/* URL display + open link */}
      {localUrl && (
        <div className={`flex items-center gap-2 px-3 py-2 bg-${color}-50 border border-${color}-200 rounded-xl text-xs`}>
          <span className={`text-${color}-700 truncate flex-1`}>{localUrl.split('/').pop()}</span>
          <a href={localUrl} target="_blank" rel="noreferrer"
            className={`text-${color}-500 hover:text-${color}-700 shrink-0`} title="Open file">
            <ExternalLink size={12} />
          </a>
          <button onClick={() => { setLocalUrl(''); onChange('') }}
            className="text-slate-400 hover:text-red-400 shrink-0" title="Remove">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Upload button + progress */}
      {uploading ? (
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full bg-${color}-500 transition-all`}
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0">{progress ?? 0}%</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed
            border-${color}-200 hover:border-${color}-400 hover:bg-${color}-50
            text-${color}-600 text-xs font-semibold transition-colors disabled:opacity-40`}
        >
          <Upload size={13} />
          {localUrl ? 'Replace file' : `Upload ${isPdf ? 'PDF' : 'Video'}`}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={pick} />

      {/* Manual URL fallback */}
      <input
        value={localUrl}
        onChange={e => { setLocalUrl(e.target.value); onChange(e.target.value) }}
        placeholder={`Or paste ${isPdf ? 'PDF' : 'video'} URL directly`}
        className="input text-xs text-slate-400 placeholder:text-slate-300"
      />
    </div>
  )
}

const SUBJECTS = [
  'Polity', 'History', 'Geography', 'Economy', 'Science & Technology',
  'Environment', 'Bihar GK', 'Current Affairs', 'English', 'Mathematics',
  'General Studies', 'CSAT', 'Ethics', 'Art & Culture', 'International Relations',
]

const LANGUAGES = [
  'Hindi', 'English', 'Hindi + English', 'Hindi (English subtitles)', 'Telugu', 'Tamil', 'Urdu',
]

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

  // Exam list — for the optional "Exam Tags" multi-select on the
  // create/edit form. Leave empty to show a course to everyone.
  const [examOptions, setExamOptions] = useState<any[]>([])
  useEffect(() => {
    api.exams.list().then((res: any) => setExamOptions(res?.data?.exams || [])).catch(() => {})
  }, [])

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

  // ── Course review queue ──────────────────────────────────
  const [reviewList, setReviewList]     = useState<any[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewOpen, setReviewOpen]     = useState(false)
  const [rejectCourse, setRejectCourse] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [previewCourse, setPreviewCourse] = useState<any>(null)

  const loadReviews = useCallback(async () => {
    setReviewLoading(true)
    try {
      const res = await api.courses.listReview()
      setReviewList(res.data?.courses || [])
    } catch (_) {}
    finally { setReviewLoading(false) }
  }, [])

  useEffect(() => { loadReviews() }, [loadReviews])

  const approveCourse = async (id: string) => {
    try {
      await api.courses.publish(id)
      showToast('Course published ✅')
      loadReviews(); load()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const confirmRejectCourse = async () => {
    if (!rejectCourse) return
    try {
      await api.courses.reject(rejectCourse.id, rejectReason)
      showToast('Course sent back to draft')
      setRejectCourse(null); setRejectReason('')
      loadReviews(); load()
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

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
      maxCoinsRedeemable: c.max_coins_redeemable ?? null,
      examTags: c.exam_tags || [],
    })
    setShowModal(true)
  }

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Courses" subtitle="Create and manage your learning catalogue" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Course Review Queue — collapsible ─────────────── */}
        {(reviewLoading || reviewList.length > 0) && (
          <div className="card border-2 border-amber-200 bg-amber-50/50">
            {/* Header — click to collapse/expand */}
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-amber-50/80 transition-colors"
              onClick={() => setReviewOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div className="text-left">
                  <p className="font-bold text-amber-900 text-sm">
                    Course Review Queue
                    {reviewList.length > 0 && (
                      <span className="ml-2 bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{reviewList.length}</span>
                    )}
                  </p>
                  <p className="text-xs text-amber-700">
                    {reviewOpen ? 'Click to collapse' : `${reviewList.length} course${reviewList.length !== 1 ? 's' : ''} waiting — click to review`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); loadReviews() }} className="text-amber-600 hover:text-amber-800 p-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </button>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`text-amber-600 transition-transform duration-200 ${reviewOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </button>

            {/* Collapsible content */}
            {reviewOpen && (
              reviewLoading ? (
                <div className="p-8 text-center text-amber-600 text-sm border-t border-amber-200">Loading...</div>
              ) : (
                <div className="border-t border-amber-200 divide-y divide-amber-100 max-h-96 overflow-y-auto">
                  {reviewList.map((c: any) => (
                    <div key={c.id} className="p-3 flex items-center gap-3 hover:bg-amber-50 group">
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} className="w-10 h-10 rounded-lg object-cover shrink-0" alt=""/>
                        : <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-lg">📚</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-snug truncate">{c.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {c.subject && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c.subject}</span>}
                          {c.language && <span className="text-xs text-slate-400">{c.language}</span>}
                          {c.is_premium && <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">💎 Premium</span>}
                          <span className="text-xs text-slate-400">{c.lesson_count || 0} lessons</span>
                          {c.price > 0 && <span className="text-xs text-green-700">₹{c.price}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setPreviewCourse(c)}
                          className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100">
                          👁 Preview
                        </button>
                        <button
                          onClick={() => { setRejectCourse(c); setRejectReason('') }}
                          className="px-2.5 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50">
                          ✕ Reject
                        </button>
                        <button
                          onClick={() => approveCourse(c.id)}
                          className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">
                          ✓ Publish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

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

                  {/* Subject */}
                  <div className="flex items-center gap-2 flex-wrap">
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
              <div className="flex items-center gap-2">
                <button onClick={() => setContentCourse(null)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <X size={14} />
                </button>
              </div>
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
                                      className={`input text-sm ${editLessonData.type === 'pdf' ? 'col-span-2' : ''}`}>
                                      {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                    </select>
                                    {editLessonData.type !== 'pdf' && (
                                      <input type="number" value={editLessonData.durationMins || ''}
                                        onChange={e => setEditLessonData({...editLessonData, durationMins: Number(e.target.value) || 0})}
                                        placeholder="Duration (mins)" className="input text-sm" />
                                    )}
                                    <FileUploadField
                                      label="PDF / Notes File"
                                      accept="application/pdf"
                                      limitMb={PDF_LIMIT_MB}
                                      existingUrl={editLessonData.notesUrl}
                                      onChange={url => setEditLessonData((d: typeof editLessonData) => ({ ...d, notesUrl: url }))}
                                      courseId={contentCourse?.id}
                                    />
                                    <FileUploadField
                                      label="Video File"
                                      accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-msvideo,video/x-matroska"
                                      limitMb={VIDEO_LIMIT_MB}
                                      existingUrl={editLessonData.videoUrl}
                                      onChange={url => setEditLessonData((d: typeof editLessonData) => ({ ...d, videoUrl: url }))}
                                      courseId={contentCourse?.id}
                                    />
                                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                      <input type="checkbox" checked={editLessonData.isFreePreview}
                                        onChange={e => setEditLessonData({...editLessonData, isFreePreview: e.target.checked, isLocked: e.target.checked ? false : editLessonData.isLocked})} className="rounded" />
                                      <span className="text-green-700 font-semibold">Free preview</span> <span className="text-slate-400">(non-enrolled)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-600">
                                      <input type="checkbox" checked={editLessonData.isLocked}
                                        onChange={e => setEditLessonData({...editLessonData, isLocked: e.target.checked, isFreePreview: e.target.checked ? false : editLessonData.isFreePreview})} className="rounded" />
                                      <span className="font-semibold text-orange-700">🔒 Locked</span>{' '}
                                      <span className="text-slate-400">(requires enrollment — free or paid)</span>
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
                                      {l.is_locked && !l.is_free_preview && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md font-medium">🔒 Locked</span>}
                                      {!l.is_locked && !l.is_free_preview && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">Unlocked</span>}
                                      {l.notes_url && <a href={l.notes_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">PDF ↗</a>}
                                    </div>
                                  </div>
                                  {/* ✏️ Edit + Delete buttons */}
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
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shrink-0 transition-colors"
                                  >
                                    <Edit size={10} /> Edit
                                  </button>
                                  <button onClick={() => deleteLesson(l.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-[11px] font-semibold shrink-0 transition-colors">
                                    <Trash2 size={10} />
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
                                <select value={newLesson.type} onChange={e => setNewLesson({...newLesson, type: e.target.value})}
                                  className={`input text-sm ${newLesson.type === 'pdf' ? 'col-span-2' : ''}`}>
                                  {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                </select>
                                {newLesson.type !== 'pdf' && (
                                  <input type="number" value={newLesson.durationMins || ''}
                                    onChange={e => setNewLesson({...newLesson, durationMins: Number(e.target.value) || 0})}
                                    placeholder="Duration (mins)" className="input text-sm" />
                                )}
                                <FileUploadField
                                  label="PDF / Notes File"
                                  accept="application/pdf"
                                  limitMb={PDF_LIMIT_MB}
                                  existingUrl={newLesson.notesUrl}
                                  onChange={url => setNewLesson((l: typeof newLesson) => ({ ...l, notesUrl: url }))}
                                  courseId={contentCourse?.id}
                                />
                                <FileUploadField
                                  label="Video File"
                                  accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-msvideo,video/x-matroska"
                                  limitMb={VIDEO_LIMIT_MB}
                                  existingUrl={newLesson.videoUrl}
                                  onChange={url => setNewLesson((l: typeof newLesson) => ({ ...l, videoUrl: url }))}
                                  courseId={contentCourse?.id}
                                />
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                  <input type="checkbox" checked={newLesson.isFreePreview}
                                    onChange={e => setNewLesson({...newLesson, isFreePreview: e.target.checked, isLocked: e.target.checked ? false : newLesson.isLocked})} className="rounded" />
                                  <span className="text-green-700 font-semibold">Free preview</span> <span className="text-slate-400">(visible to everyone, even non-enrolled)</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-600">
                                  <input type="checkbox" checked={newLesson.isLocked}
                                    onChange={e => setNewLesson({...newLesson, isLocked: e.target.checked, isFreePreview: e.target.checked ? false : newLesson.isFreePreview})} className="rounded" />
                                  <span className="font-semibold text-orange-700">🔒 Locked</span>{' '}
                                  <span className="text-slate-400">(requires enrollment — free or paid)</span>
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
                    <DynamicSelect type="subjects" value={form.subject} onChange={v => setForm({...form, subject:v})} placeholder="Select a subject…" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Language</label>
                    <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}
                      className="input w-full px-3 py-2.5 text-sm">
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      "Hindi + English" means the course uses both languages (most common for BPSC)
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                      rows={3} className="input w-full resize-none" placeholder="What will students learn? Who is this course for?" />
                  </div>
                </div>
              </section>

              {/* Section 2: Pricing */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-xs font-black">2</div>
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
                          className={`input w-full ${(!form.price || form.price <= 0) ? 'border-red-300' : ''}`} placeholder="999" />
                        {(!form.price || form.price <= 0) && (
                          <p className="text-[11px] text-red-500 mt-1">Sale Price is required for a paid course</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Original Price (₹)</label>
                        <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: +e.target.value})}
                          className="input w-full" placeholder="1999" />
                        <p className="text-[10px] text-slate-400 mt-1">Shown as strikethrough</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Max Coins Redeemable</label>
                        <input type="number" min={0} value={form.maxCoinsRedeemable ?? ''}
                          onChange={e => setForm({...form, maxCoinsRedeemable: e.target.value === '' ? null : +e.target.value})}
                          className="input w-full" placeholder="Default (50)" />
                        <p className="text-[10px] text-slate-400 mt-1">Max coins a buyer can redeem as a discount on this course. Leave blank to use the global default.</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Total Hours *</label>
                    <input type="number" step="0.5" value={form.totalHours} onChange={e => setForm({...form, totalHours: e.target.value === '' ? '' : +e.target.value})}
                      className={`input w-full ${(!form.totalHours || +form.totalHours <= 0) ? 'border-red-300' : ''}`} placeholder="0" />
                    {(!form.totalHours || +form.totalHours <= 0) && (
                      <p className="text-[11px] text-red-500 mt-1">Total Hours is required and must be greater than 0</p>
                    )}
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

                {/* Exam Tags — optional. Leave empty to show this course
                    to everyone regardless of which exam they selected at
                    onboarding (most courses). Select one or more exams to
                    restrict it to users preparing for those exams. */}
                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Exam Tags <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Leave empty to show this course to everyone. Select exams to show it only to users preparing for those exams.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {examOptions.map((exam: any) => {
                      const selected = form.examTags.includes(exam.name)
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            examTags: selected
                              ? form.examTags.filter((t: string) => t !== exam.name)
                              : [...form.examTags, exam.name]
                          })}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                            ${selected ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}
                        >
                          {exam.emoji} {exam.name}
                        </button>
                      )
                    })}
                    {examOptions.length === 0 && (
                      <p className="text-xs text-slate-400">No exams configured yet.</p>
                    )}
                  </div>
                  {form.examTags.length > 0 && (
                    <button type="button" onClick={() => setForm({...form, examTags: []})}
                      className="mt-2 text-[11px] text-slate-400 hover:text-slate-600 underline">
                      Clear — show to everyone
                    </button>
                  )}
                </div>
              </section>

              {/* Section 3: Options */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-black">3</div>
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

              {/* Section 4: What You'll Learn */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-black">4</div>
                  <h3 className="font-bold text-slate-800">What Students Will Learn *</h3>
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
                    <p className="text-[11px] text-red-500 px-1">At least one learning outcome is required</p>
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
              <button onClick={save} disabled={saving || !form.title.trim() || !form.subject.trim() || !form.totalHours || +form.totalHours <= 0 || form.whatYouLearn.length === 0 || (form.isPaid && (!form.price || form.price <= 0))}
                className="btn-primary disabled:opacity-40">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : editing ? 'Save Changes' : 'Create Course →'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Course Preview Modal ──────────────────────────── */}
      {previewCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewCourse(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-start justify-between shrink-0">
              <div className="flex items-start gap-3">
                {previewCourse.thumbnail_url && (
                  <img src={previewCourse.thumbnail_url} className="w-14 h-14 rounded-xl object-cover shrink-0 border-2 border-white/20" alt=""/>
                )}
                <div>
                  <p className="font-bold text-white text-base leading-snug">{previewCourse.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {previewCourse.subject && <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded">{previewCourse.subject}</span>}
                    {previewCourse.language && <span className="text-xs text-white/60">{previewCourse.language}</span>}
                    {previewCourse.is_premium && <span className="text-xs text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded font-bold">💎 Premium</span>}
                    <span className="text-xs text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded">⏳ Under Review</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewCourse(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 ml-2">✕</button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Key stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Lessons',  value: previewCourse.lesson_count || 0,    emoji: '📖' },
                  { label: 'Hours',    value: previewCourse.total_hours || 0,      emoji: '⏱' },
                  { label: 'Price',    value: previewCourse.price > 0 ? `₹${previewCourse.price}` : 'Free', emoji: '💰' },
                  { label: 'Chapters', value: previewCourse.chapter_count || '—',  emoji: '📑' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl">{s.emoji}</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {previewCourse.description && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{previewCourse.description}</p>
                </div>
              )}

              {/* What you learn */}
              {previewCourse.what_you_learn?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What you'll learn</p>
                  <ul className="space-y-1.5">
                    {previewCourse.what_you_learn.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exam tags */}
              {previewCourse.exam_tags?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Exam Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {previewCourse.exam_tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50">
              <button
                onClick={() => { setRejectCourse(previewCourse); setRejectReason(''); setPreviewCourse(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50">
                ✕ Reject
              </button>
              <button
                onClick={() => { approveCourse(previewCourse.id); setPreviewCourse(null) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700">
                ✓ Publish Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Course Rejection Modal ─────────────────────────── */}
      {rejectCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reject Course</h3>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">"{rejectCourse.title}"</p>
              </div>
              <button onClick={() => setRejectCourse(null)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            <p className="text-sm text-slate-600 mb-3">Tell the creator what needs to be fixed:</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Missing lesson content, incorrect pricing, thumbnail needed..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectCourse(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmRejectCourse} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">Send Back to Draft</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}