'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, useToast } from '@/components/ui/feedback'
import DynamicSelect from '@/components/ui/DynamicSelect'
import {
  Plus, X, RefreshCw, Edit, Trash2, PenLine, Clock, CheckCircle2,
  FileText, CalendarDays, Award, AlignLeft, Send, Loader2, Inbox,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

// Number input — empty-friendly (same pattern as the Coins page)
function NumInput({ value, onChange, placeholder = '', min = 0, max, className = '' }: any) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value === 0 ? '' : String(value)) }, [value])
  return (
    <input type="number" className={`input ${className}`} value={raw} placeholder={placeholder}
      min={min} max={max}
      onChange={e => { setRaw(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (!raw.trim() || isNaN(Number(raw))) { setRaw(''); onChange(0) } }} />
  )
}

const EMPTY_FORM = {
  questionText: '', subject: '', marks: 10, wordLimit: 250,
  modelAnswer: '', tips: '', scheduledFor: '', status: 'draft',
  isPyq: false, pyqYear: '' as string | number,
}

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

export default function AnswerWritingPage() {
  const { showToast, ToastComponent } = useToast()
  const [tab, setTab] = useState<'questions' | 'submissions'>('questions')

  // ── Questions tab state ─────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [qStatusFilter, setQStatusFilter] = useState('')

  const { data: qData, loading: qLoading, error: qError, refetch: refetchQuestions } =
    useApiData<any>(() => api.answerWriting.listQuestions({ limit: 100, ...(qStatusFilter ? { status: qStatusFilter } : {}) }), [qStatusFilter])
  const questions: any[] = qData?.questions || []

  // ── Sample-answer modal state ───────────────────────────────
  const [seeding, setSeeding]         = useState<any>(null)   // question getting a sample
  const [seedText, setSeedText]       = useState('')
  const [seedImages, setSeedImages]   = useState<File[]>([])
  const [seedPdf, setSeedPdf]         = useState<File | null>(null)
  const [seedSaving, setSeedSaving]   = useState(false)

  // ── Submissions tab state ───────────────────────────────────
  // 'pending' spans submitted + peer_reviewed — a peer-reviewed answer is
  // still waiting on a mentor grade.
  const [subStatusFilter, setSubStatusFilter] = useState('pending')
  const [reviewing, setReviewing]             = useState<any>(null)   // submission being graded
  const [reviewScore, setReviewScore]         = useState(0)
  const [reviewFeedback, setReviewFeedback]   = useState('')

  const { data: sData, loading: sLoading, error: sError, refetch: refetchSubmissions } =
    useApiData<any>(() => api.answerWriting.listSubmissions({ limit: 100, ...(subStatusFilter ? { status: subStatusFilter } : {}) }), [tab === 'submissions', subStatusFilter])
  const submissions: any[] = sData?.submissions || []

  const pendingCount = questions.reduce((s, q) => s + (q.pending_count || 0), 0)

  // ── Mutations ───────────────────────────────────────────────
  const { mutate: saveQuestion, loading: saving } = useMutation(
    (d: any) => editing ? api.answerWriting.updateQuestion(editing.id, d) : api.answerWriting.createQuestion(d),
    {
      onSuccess: () => {
        setShowForm(false); setEditing(null); setForm(EMPTY_FORM)
        refetchQuestions(); showToast(editing ? 'Question updated ✅' : 'Question created ✅')
      },
      onError: (m) => showToast(m, 'error'),
    }
  )

  const { mutate: saveReview, loading: reviewSaving } = useMutation(
    (id: string, d: any) => api.answerWriting.reviewSubmission(id, d),
    {
      onSuccess: () => {
        setReviewing(null); refetchSubmissions(); refetchQuestions()
        showToast('Review saved — the student has been notified ✅')
      },
      onError: (m) => showToast(m, 'error'),
    }
  )

  const deleteQuestion = async (q: any) => {
    if (!confirm(`Delete this question?\n\n"${q.question_text.slice(0, 120)}…"\n\nAll its submissions will be deleted too.`)) return
    try { await api.answerWriting.deleteQuestion(q.id); showToast('Question deleted'); refetchQuestions() }
    catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (q: any) => {
    setEditing(q)
    setForm({
      questionText: q.question_text, subject: q.subject || '',
      marks: +q.marks || 10, wordLimit: +q.word_limit || 250,
      modelAnswer: q.model_answer || '', tips: q.tips || '',
      scheduledFor: q.scheduled_for ? String(q.scheduled_for).split('T')[0] : '',
      status: q.status,
      isPyq: q.is_pyq === true,
      pyqYear: q.pyq_year ?? '',
    })
    setShowForm(true)
  }

  const openReview = (s: any) => {
    setReviewing(s)
    setReviewScore(s.score != null ? +s.score : 0)
    setReviewFeedback(s.feedback || '')
  }

  // ── Sample ("seed") answer ──────────────────────────────────
  // Peer review is reciprocal per question: a student unlocks the reviews on
  // their own answer by reviewing someone else's answer to the same question.
  // The first student to attempt a question has nobody to review, so every
  // question needs one sample answer in the pool before it can be published.
  const saveSeed = async () => {
    if (!seeding) return
    const fd = new FormData()
    if (seedText.trim()) fd.append('answerText', seedText.trim())
    seedImages.forEach(f => fd.append('images', f))
    if (seedPdf) fd.append('pdf', seedPdf)
    if (!seedText.trim() && !seedImages.length && !seedPdf) {
      showToast('Add answer text, photos or a PDF', 'error'); return
    }
    setSeedSaving(true)
    try {
      const res = await api.answerWriting.createSeed(seeding.id, fd)
      showToast(res?.message || 'Sample answer saved ✅')
      setSeeding(null); setSeedText(''); setSeedImages([]); setSeedPdf(null)
      refetchQuestions()
    } catch (e: any) {
      showToast(e.message || 'Failed to save the sample answer', 'error')
    } finally {
      setSeedSaving(false)
    }
  }

  const publishQuestion = async (q: any) => {
    try {
      await api.answerWriting.updateQuestion(q.id, { status: 'published' })
      showToast('Question published ✅'); refetchQuestions()
    } catch (e: any) {
      showToast(e.message || 'Could not publish', 'error')
    }
  }

  const handleSaveQuestion = () => {
    if (!form.questionText.trim()) { showToast('Question text is required', 'error'); return }
    saveQuestion({
      ...form,
      scheduledFor: form.scheduledFor?.trim() || null,
      isPyq: form.isPyq === true,
      pyqYear: form.isPyq && form.pyqYear ? +form.pyqYear : null,
    })
  }

  return (
    <div className="min-h-screen">
      <Header title="Answer Writing" subtitle="Daily Mains practice — post questions, students write answers, you grade them with feedback" />
      {ToastComponent}

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Stat chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <FileText size={16} className="text-brand-600" />,   label: 'Total Questions',  value: questions.length },
            { icon: <CheckCircle2 size={16} className="text-green-600"/>, label: 'Published',        value: questions.filter(q => q.status === 'published').length },
            { icon: <Inbox size={16} className="text-amber-600" />,       label: 'Pending Reviews',  value: pendingCount },
            { icon: <PenLine size={16} className="text-purple-600" />,    label: 'Total Submissions', value: questions.reduce((s, q) => s + (q.submission_count || 0), 0) },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">{s.icon}</div>
              <div>
                <p className="text-xl font-black text-slate-900 leading-none">{formatNumber(s.value)}</p>
                <p className="text-[11px] text-slate-500 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTab('questions')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'questions' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            📝 Questions
          </button>
          <button onClick={() => setTab('submissions')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'submissions' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            ✍️ Submissions {pendingCount > 0 && <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        </div>

        {/* ── Tab: Questions ──────────────────────────────────── */}
        {tab === 'questions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <select value={qStatusFilter} onChange={e => setQStatusFilter(e.target.value)} className="input w-44 text-sm">
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <div className="flex gap-2">
                <button onClick={refetchQuestions} className="btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
                <button onClick={openNew} className="btn-primary text-sm"><Plus size={13} /> New Question</button>
              </div>
            </div>

            {/* Create / edit form */}
            {showForm && (
              <div className="card p-5 border-2 border-brand-200 bg-brand-50/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <PenLine size={15} className="text-brand-600" /> {editing ? 'Edit Question' : 'New Question'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditing(null) }} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={13} /></button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Question *</label>
                  <textarea value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })}
                    rows={3} className="input text-sm w-full resize-y"
                    placeholder="e.g. Discuss the role of the Bihar Land Reforms Act in shaping agrarian relations in the state. (15 marks, 250 words)" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject</label>
                    <DynamicSelect type="subjects" value={form.subject} onChange={(v: string) => setForm({ ...form, subject: v })} placeholder="Select Subject" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">🏅 Marks</label>
                    <NumInput value={form.marks} onChange={(v: number) => setForm({ ...form, marks: v })} min={1} max={100} placeholder="10" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Word Limit</label>
                    <NumInput value={form.wordLimit} onChange={(v: number) => setForm({ ...form, wordLimit: v })} min={50} max={2000} placeholder="250" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">📅 Schedule For</label>
                    <input type="date" value={form.scheduledFor} onChange={e => setForm({ ...form, scheduledFor: e.target.value })} className="input text-sm w-full" />
                  </div>
                </div>

                {/* PYQ — Previous Year Question badge on the app card */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isPyq}
                      onChange={e => setForm({ ...form, isPyq: e.target.checked })}
                      className="w-4 h-4 accent-purple-600" />
                    <span className="text-xs font-bold text-slate-600">📜 Previous Year Question (PYQ)</span>
                  </label>
                  {form.isPyq && (
                    <div className="w-28">
                      <input type="number" value={form.pyqYear} placeholder="Year"
                        min={1990} max={2030}
                        onChange={e => setForm({ ...form, pyqYear: e.target.value })}
                        className="input text-sm w-full" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Model Answer <span className="font-normal text-slate-400">(revealed to the student the day after they submit their own)</span></label>
                  <textarea value={form.modelAnswer} onChange={e => setForm({ ...form, modelAnswer: e.target.value })}
                    rows={6} className="input text-sm w-full resize-y" placeholder="The ideal structured answer students should compare theirs against…" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Writing Tips <span className="font-normal text-slate-400">(optional — shown before the student starts writing)</span></label>
                  <textarea value={form.tips} onChange={e => setForm({ ...form, tips: e.target.value })}
                    rows={2} className="input text-sm w-full resize-y" placeholder="e.g. Structure: intro → 3 arguments with examples → balanced conclusion" />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Draft / Publish as a segmented pill — same flow as the
                      Current Affairs editor. A sample answer is recommended for
                      peer review but not required, so Publish is always allowed. */}
                  <div>
                    <div className="inline-flex rounded-xl overflow-hidden border border-slate-200 text-xs font-semibold">
                      {(['draft', 'published'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, status: s })}
                          className={`px-4 py-2 transition-colors ${
                            form.status === s
                              ? s === 'published' ? 'bg-green-500 text-white' : 'bg-slate-700 text-white'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`}>
                          {s === 'published' ? '✅ Publish' : '📝 Draft'}
                        </button>
                      ))}
                    </div>
                    {(!editing || !editing.seed_count) && (
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        Tip: add a sample answer so the first students have something to review.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowForm(false); setEditing(null) }} className="btn-secondary text-sm">Cancel</button>
                    <button onClick={handleSaveQuestion} disabled={saving} className="btn-primary text-sm">
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {editing
                        ? (form.status === 'published' ? 'Save & Publish' : 'Save Changes')
                        : (form.status === 'published' ? 'Create & Publish' : 'Create Draft')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Question cards */}
            {qLoading ? <PageLoader /> : qError ? <ErrorMessage message={qError} onRetry={refetchQuestions} /> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {questions.map(q => (
                  <div key={q.id} className="card p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${q.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{q.status}</span>
                        {q.subject && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">{q.subject}</span>}
                        {q.is_pyq && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">📜 PYQ{q.pyq_year ? ` ${q.pyq_year}` : ''}</span>}
                        {q.scheduled_for && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                            <CalendarDays size={10} /> {new Date(q.scheduled_for).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {q.pending_count > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">{q.pending_count} to grade</span>
                        )}
                        {q.seed_count > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">📘 sample</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openEdit(q)} className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center"><Edit size={12} className="text-slate-500" /></button>
                        <button onClick={() => deleteQuestion(q)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12} className="text-red-500" /></button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 font-semibold leading-relaxed line-clamp-3">{q.question_text}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-2 border-t border-slate-50">
                      <span className="flex items-center gap-1"><Award size={12} className="text-amber-500" /> {q.marks} marks</span>
                      <span className="flex items-center gap-1"><AlignLeft size={12} /> {q.word_limit} words</span>
                      <span className="flex items-center gap-1"><PenLine size={12} /> {q.submission_count || 0} submissions</span>
                      {!q.model_answer && <span className="text-red-400 font-semibold">no model answer</span>}
                    </div>

                    {/* Sample answer — recommended for peer review (gives the
                        first students something to review) but not required. */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSeeding(q); setSeedText(''); setSeedImages([]); setSeedPdf(null)
                        }}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                        <FileText size={12} /> {q.seed_count > 0 ? 'Replace sample answer' : 'Add sample answer'}
                      </button>
                      {q.status !== 'published' && (
                        <button
                          onClick={() => publishQuestion(q)}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                          <Send size={12} /> Publish
                        </button>
                      )}
                    </div>
                    {!q.seed_count && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Tip: add a sample answer so the first students have something to review
                        and can unlock their own peer reviews sooner.
                      </p>
                    )}
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="col-span-full card p-12 text-center">
                    <PenLine size={32} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-slate-600 mb-1">No questions yet</p>
                    <p className="text-xs text-slate-400 mb-4">Post your first Mains answer-writing question</p>
                    <button onClick={openNew} className="btn-primary text-sm mx-auto"><Plus size={13} /> New Question</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Submissions ────────────────────────────────── */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <select value={subStatusFilter} onChange={e => setSubStatusFilter(e.target.value)} className="input w-56 text-sm">
                <option value="pending">⏳ Awaiting your grade</option>
                <option value="submitted">· not peer reviewed yet</option>
                <option value="peer_reviewed">· peer reviewed</option>
                <option value="reviewed">✅ Graded</option>
                <option value="">All submissions</option>
              </select>
              <button onClick={refetchSubmissions} className="btn-secondary px-3 py-2"><RefreshCw size={13} /></button>
            </div>

            {sLoading ? <PageLoader /> : sError ? <ErrorMessage message={sError} onRetry={refetchSubmissions} /> : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Question</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Words</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Score</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Submitted</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{s.user_name}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs"><span className="line-clamp-2">{s.question_text}</span></td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          <span className={+s.word_count > +s.word_limit ? 'text-red-500 font-semibold' : ''}>{s.word_count}</span>
                          <span className="text-slate-300"> / {s.word_limit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'reviewed'
                            ? <span className="font-bold text-green-700">{Number(s.score)}/{s.marks}</span>
                            : <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">pending</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openReview(s)} className="btn-secondary text-xs py-1.5 px-3">
                            {s.status === 'reviewed' ? 'View / Regrade' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                        {subStatusFilter === 'pending' ? 'No answers waiting for your grade 🎉' : 'No submissions yet'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sample answer modal ─────────────────────────────── */}
      {seeding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !seedSaving && setSeeding(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Sample Answer</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seeds the peer-review pool for this question — one per question
                </p>
              </div>
              <button onClick={() => setSeeding(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
                <p className="text-sm text-slate-800 font-semibold leading-relaxed line-clamp-3">{seeding.question_text}</p>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Students see this labelled <strong>&ldquo;Sample answer&rdquo;</strong> — it is never
                  presented as another student&apos;s work. It stays in the pool
                  indefinitely so every student can use it to unlock their own reviews,
                  and it never appears in your grading queue or on the leaderboards.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Answer text</label>
                <textarea value={seedText} onChange={e => setSeedText(e.target.value)}
                  rows={10} className="input text-sm w-full resize-y font-serif"
                  placeholder="Write the sample answer as a student would — introduction, body, conclusion…" />
                <p className="text-[11px] text-slate-400 mt-1">
                  {wordCount(seedText)} words
                  {seeding.word_limit ? ` · limit ${seeding.word_limit}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">…or photos (max 5)</label>
                  <input type="file" accept="image/*" multiple
                    onChange={e => setSeedImages(Array.from(e.target.files || []).slice(0, 5))}
                    className="text-xs w-full" />
                  {seedImages.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">{seedImages.length} photo(s) selected</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">…or a PDF</label>
                  <input type="file" accept="application/pdf"
                    onChange={e => setSeedPdf(e.target.files?.[0] || null)}
                    className="text-xs w-full" />
                  {seedPdf && <p className="text-[11px] text-slate-500 mt-1 truncate">{seedPdf.name}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setSeeding(null)} disabled={seedSaving} className="btn-secondary text-sm">Cancel</button>
              <button onClick={saveSeed} disabled={seedSaving} className="btn-primary text-sm">
                {seedSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save sample answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review modal ────────────────────────────────────── */}
      {reviewing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !reviewSaving && setReviewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Grade Answer — {reviewing.user_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reviewing.word_count} words · {reviewing.time_taken_secs ? `${Math.round(reviewing.time_taken_secs / 60)} min · ` : ''}
                  submitted {new Date(reviewing.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">Question · {reviewing.marks} marks · {reviewing.word_limit} words</p>
                <p className="text-sm text-slate-800 font-semibold leading-relaxed">{reviewing.question_text}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Student's Answer</p>
                {reviewing.answer_pdf ? (
                  // PDF answer — inline so grading needs no download round-trip
                  <div className="space-y-2">
                    <object data={reviewing.answer_pdf} type="application/pdf"
                      className="w-full h-[60vh] rounded-xl border border-slate-200">
                      <p className="text-sm text-slate-600 p-4">
                        This browser can&apos;t preview PDFs inline.
                      </p>
                    </object>
                    <a href={reviewing.answer_pdf} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline">
                      <FileText size={12} /> Open the PDF in a new tab
                    </a>
                  </div>
                ) : (reviewing.answer_images?.length > 0) ? (
                  // Handwritten answer — photographed notebook pages, in order
                  <div className="space-y-3">
                    {reviewing.answer_images.map((url: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt={`Answer page ${i + 1}`}
                        className="w-full rounded-xl border border-slate-200" loading="lazy" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{reviewing.answer_text}</p>
                )}
                {(reviewing.peer_review_count > 0) && (
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                    🤝 {reviewing.peer_review_count} peer review{reviewing.peer_review_count > 1 ? 's' : ''}
                    {reviewing.avg_peer_rating != null && <> · avg ⭐ {Number(reviewing.avg_peer_rating).toFixed(1)}</>}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 space-y-3 bg-slate-50/50 rounded-b-2xl">
              <div className="flex items-end gap-3">
                <div className="w-36">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Score (out of {reviewing.marks})</label>
                  <NumInput value={reviewScore} onChange={setReviewScore} min={0} max={+reviewing.marks} placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Feedback for the student</label>
                  <textarea value={reviewFeedback} onChange={e => setReviewFeedback(e.target.value)}
                    rows={2} className="input text-sm w-full resize-y"
                    placeholder="Good structure. Add 1-2 concrete examples and a stronger conclusion…" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setReviewing(null)} disabled={reviewSaving} className="btn-secondary text-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (reviewScore > +reviewing.marks) { showToast(`Score can't exceed ${reviewing.marks}`, 'error'); return }
                    saveReview(reviewing.id, { score: reviewScore, feedback: reviewFeedback.trim() })
                  }}
                  disabled={reviewSaving}
                  className="btn-primary text-sm">
                  {reviewSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save Review & Notify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
