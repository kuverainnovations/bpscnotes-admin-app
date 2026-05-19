'use client'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useApiData, useMutation } from '@/lib/hooks'
import { PageLoader, ErrorMessage, EmptyState, useToast } from '@/components/ui/feedback'
import { getStatusColor, getDifficultyColor, formatNumber } from '@/lib/utils'
import { Search, Plus, Edit, Trash2, HelpCircle, RefreshCw, ListPlus } from 'lucide-react'
import DynamicSelect from '@/components/ui/DynamicSelect'

const EMPTY_FORM = {
  title: '', subject: '', type: 'topic', difficulty: 'medium',
  totalQuestions: 10, durationMins: 15, passingScore: 60,
  coinsReward: 10, examTags: ['BPSC 70th CCE'], status: 'published', scheduledFor: '',
}

const EMPTY_Q = {
  question: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctOption: 'a', explanation: '', difficulty: 'medium',
}

export default function QuizzesPage() {
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showQModal, setShowQModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [questions, setQuestions] = useState<any[]>([{ ...EMPTY_Q }])
  const { showToast, ToastComponent } = useToast()

  const { data, loading, error, refetch } = useApiData<any>(
    () => api.quizzes.list({ search, type: typeFilter }),
    [search, typeFilter]
  )
  const quizzes: any[] = data?.quizzes || []

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.quizzes.update(editing.id, d) : api.quizzes.create(d),
    {
      onSuccess: () => { setShowModal(false); refetch(); showToast(editing ? 'Quiz updated ✅' : 'Quiz created ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: saveQuestions, loading: savingQ } = useMutation(
    (quizId: string, qs: any[]) => api.quizzes.addQuestions(quizId, qs),
    {
      onSuccess: () => { setShowQModal(false); showToast(`${questions.length} questions added ✅`) },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: remove } = useMutation(
    (id: string) => api.quizzes.update(id, { status: 'rejected' }),
    { onSuccess: () => { refetch(); showToast('Quiz removed') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew = () => {
    setEditing(null); setForm(EMPTY_FORM); setShowModal(true)
  }
  const openEdit = (q: any) => {
    setEditing(q)
    setForm({
      title: q.title, subject: q.subject, type: q.type, difficulty: q.difficulty,
      totalQuestions: q.total_questions, durationMins: q.duration_mins,
      passingScore: q.passing_score, coinsReward: q.coins_reward,
      examTags: q.exam_tags || [], status: q.status,
      scheduledFor: q.scheduled_for ? q.scheduled_for.split('T')[0] : '',
    })
    setShowModal(true)
  }
  const openQuestions = (q: any) => {
    setSelectedQuiz(q)
    setQuestions([{ ...EMPTY_Q }])
    setShowQModal(true)
  }

  const addQuestionRow = () => setQuestions(prev => [...prev, { ...EMPTY_Q }])
  const updateQ = (i: number, key: string, val: string) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [key]: val } : q))
  const removeQ = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i))

  const handleSaveQuestions = () => {
    const valid = questions.filter(q => q.question && q.optionA && q.optionB && q.optionC && q.optionD)
    if (!valid.length) { showToast('Fill at least one complete question', 'error'); return }
    saveQuestions(selectedQuiz.id, valid)
  }

  const stats = [
    { label: 'Daily Quizzes', value: quizzes.filter(q => q.type === 'daily').length, emoji: '🎯' },
    { label: 'Topic Quizzes', value: quizzes.filter(q => q.type === 'topic').length, emoji: '📚' },
    { label: 'Mock Tests',    value: quizzes.filter(q => q.type === 'mock').length,  emoji: '📝' },
    { label: 'Total Attempts', value: formatNumber(quizzes.reduce((a, q) => a + (q.attempt_count || 0), 0)), emoji: '👥' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Quizzes & Mock Tests" subtitle="Manage all quizzes, topic tests and mock exams" />
      <div className="p-6 space-y-5 animate-fade-in">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="input pl-9" />
          </div>
          <div className="flex gap-2">
            {['', 'daily', 'topic', 'mock'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${typeFilter === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={refetch} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} />Add Quiz</button>
        </div>

        {loading ? <PageLoader /> : error ? (
          <div className="card"><ErrorMessage message={error} onRetry={refetch} /></div>
        ) : quizzes.length === 0 ? (
          <div className="card"><EmptyState icon="🎯" title="No quizzes yet" subtitle="Create your first quiz" /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Quiz', 'Type', 'Subject', 'Questions', 'Difficulty', 'Attempts', 'Avg Score', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                          <HelpCircle size={16} className="text-purple-600" />
                        </div>
                        <p className="font-semibold text-slate-800 max-w-[180px] truncate">{quiz.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${quiz.type === 'daily' ? 'bg-purple-100 text-purple-700 border-purple-200' : quiz.type === 'mock' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                        {quiz.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{quiz.subject}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{quiz.total_questions}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getDifficultyColor ? getDifficultyColor(quiz.difficulty) : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {quiz.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatNumber(quiz.attempt_count || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${quiz.avg_score || 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{parseFloat(quiz.avg_score || 0).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${getStatusColor(quiz.status)}`}>{quiz.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openQuestions(quiz)} title="Add Questions"
                          className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors">
                          <ListPlus size={13} className="text-green-600" />
                        </button>
                        <button onClick={() => openEdit(quiz)}
                          className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors">
                          <Edit size={13} className="text-yellow-600" />
                        </button>
                        <button onClick={() => remove(quiz.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={13} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>
                {editing ? 'Edit Quiz' : 'Create Quiz'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Quiz title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                    <option value="daily">Daily</option>
                    <option value="topic">Topic</option>
                    <option value="mock">Mock Test</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                  <DynamicSelect
                    type="subjects"
                    value={form.subject}
                    onChange={v => setForm({ ...form, subject: v })}
                    placeholder="Select subject…"
                  />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="input">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Total Questions</label>
                  <input type="number" value={form.totalQuestions} onChange={e => setForm({ ...form, totalQuestions: Number(e.target.value) })} className="input" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration (mins)</label>
                  <input type="number" value={form.durationMins} onChange={e => setForm({ ...form, durationMins: Number(e.target.value) })} className="input" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Passing Score %</label>
                  <input type="number" value={form.passingScore} onChange={e => setForm({ ...form, passingScore: Number(e.target.value) })} className="input" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Coins Reward</label>
                  <input type="number" value={form.coinsReward} onChange={e => setForm({ ...form, coinsReward: Number(e.target.value) })} className="input" />
                </div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              {form.type === 'daily' && (
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Scheduled For</label>
                  <input type="date" value={form.scheduledFor} onChange={e => setForm({ ...form, scheduledFor: e.target.value })} className="input" />
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save(form)} disabled={saving || !form.title} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Questions Modal */}
      {showQModal && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQModal(false)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-3xl animate-slide-up overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display,serif' }}>Add Questions</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedQuiz.title}</p>
              </div>
              <button onClick={() => setShowQModal(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Question {i + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQ(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <textarea
                    value={q.question}
                    onChange={e => updateQ(i, 'question', e.target.value)}
                    className="input h-16 resize-none"
                    placeholder="Question text *"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${q.correctOption === opt.toLowerCase() ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{opt}</span>
                        <input
                          value={q[`option${opt}` as keyof typeof q]}
                          onChange={e => updateQ(i, `option${opt}`, e.target.value)}
                          className="input text-xs"
                          placeholder={`Option ${opt}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Correct Answer</label>
                      <select value={q.correctOption} onChange={e => updateQ(i, 'correctOption', e.target.value)} className="input text-xs">
                        <option value="a">Option A</option>
                        <option value="b">Option B</option>
                        <option value="c">Option C</option>
                        <option value="d">Option D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty</label>
                      <select value={q.difficulty} onChange={e => updateQ(i, 'difficulty', e.target.value)} className="input text-xs">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Explanation (optional)</label>
                    <input value={q.explanation} onChange={e => updateQ(i, 'explanation', e.target.value)} className="input text-xs" placeholder="Brief explanation of the correct answer" />
                  </div>
                </div>
              ))}
              <button onClick={addQuestionRow} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
                + Add Another Question
              </button>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowQModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveQuestions} disabled={savingQ} className="btn-primary disabled:opacity-50">
                {savingQ ? 'Saving...' : `Save ${questions.filter(q => q.question).length} Questions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
