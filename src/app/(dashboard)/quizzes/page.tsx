'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useMutation, useDebounce } from '@/lib/hooks'
import { useToast } from '@/components/ui/feedback'
import { formatNumber } from '@/lib/utils'
import {
  Search, Plus, Edit, Trash2, HelpCircle, RefreshCw,
  ChevronLeft, ChevronRight,
  X, Check, Layers, Clock, Coins, Target, BookOpen,
  ListPlus, Eye, AlertCircle, CheckCircle2, Filter,
  ChevronDown, Pencil, Loader2,
} from 'lucide-react'

const LIMIT = 15

const TYPE_META: Record<string,{label:string;color:string;bg:string}> = {
  daily: { label:'Daily',      color:'text-purple-700', bg:'bg-purple-100 border-purple-200' },
  topic: { label:'Topic',      color:'text-blue-700',   bg:'bg-blue-100 border-blue-200' },
  mock:  { label:'Mock Test',  color:'text-orange-700', bg:'bg-orange-100 border-orange-200' },
}

const OPTION_LABELS = ['A','B','C','D','E']

// Issue 8: controlled number input — shows empty string not 0
function NumInput({ value, onChange, placeholder='', className='', min=0, max=9999 }:
  {value:number; onChange:(v:number)=>void; placeholder?:string; className?:string; min?:number; max?:number}) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value === 0 ? '' : String(value)) }, [value])
  return (
    <input
      type="number" className={`input ${className}`}
      value={raw} min={min} max={max}
      placeholder={placeholder || String(min)}
      onChange={e => { setRaw(e.target.value); const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n) }}
      onBlur={() => { if (raw === '' || isNaN(Number(raw))) { setRaw(''); onChange(0) } }}
    />
  )
}

const EMPTY_FORM = {
  title:'', subject:'', type:'topic',
  totalQuestions:10, durationMins:15, passingScore:60,
  coinsReward:10, status:'published', scheduledFor:'',
}

// Issue 13: admin chooses option count (2–5)
function emptyQ(optCount=4) {
  optCount = Math.min(optCount, 4) // DB max is 4
  return {
    question:'', questionType:'text', questionImageUrl:'',
    optionType:'text', options:Array(optCount).fill(''), optionImages:Array(optCount).fill(''),
    correctOption:0,
    explanation:'', // Issue 14: explanation = hint shown in app after answer
    optionCount:optCount,
  }
}

export default function QuizzesPage() {
  const { showToast, ToastComponent } = useToast()

  // List state
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState('')
  const [page, setPage]       = useState(1)
  const debouncedSearch       = useDebounce(search, 400)

  // Modal state
  const [showModal, setShowModal]   = useState(false)
  const [showQModal, setShowQModal] = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null)
  const [form, setForm]             = useState<any>(EMPTY_FORM)
  const [questions, setQuestions]   = useState<any[]>([emptyQ()])

  // Issue 10: existing questions for edit
  const [existingQuestions, setExistingQuestions] = useState<any[]>([])
  const [loadingQs, setLoadingQs]   = useState(false)
  const [qTab, setQTab]             = useState<'existing'|'add'>('existing')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.quizzes.list({ search: debouncedSearch, type: typeFilter, page, limit: LIMIT })
      setQuizzes(res.data?.quizzes || [])
      // Issue 4: total from API not local count
      setTotal(res.meta?.total ?? res.data?.total ?? res.data?.quizzes?.length ?? 0)
    } catch (e: any) { showToast(e.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }, [debouncedSearch, typeFilter, page])

  useEffect(() => { setPage(1) }, [debouncedSearch, typeFilter])
  useEffect(() => { load() }, [load])

  // Issue 10: load existing questions when opening Q modal
  const openQuestions = async (quiz: any) => {
    setSelectedQuiz(quiz)
    setQuestions([emptyQ()])
    setShowQModal(true)
    setQTab('existing')
    setLoadingQs(true)
    try {
      const res = await api.quizzes.getQuestions?.(quiz.id)
      setExistingQuestions(res?.data?.questions || [])
    } catch { setExistingQuestions([]) }
    finally { setLoadingQs(false) }
  }

  const { mutate: save, loading: saving } = useMutation(
    (d: any) => editing ? api.quizzes.update(editing.id, d) : api.quizzes.create(d),
    {
      onSuccess: () => { setShowModal(false); load(); showToast(editing ? 'Quiz updated ✅' : 'Quiz created ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  const { mutate: saveQuestions, loading: savingQ } = useMutation(
    (args: any) => api.quizzes.addQuestions(args.id, args.qs),
    {
      onSuccess: () => { setShowQModal(false); load(); showToast('Questions saved ✅') },
      onError: (msg) => showToast(msg, 'error'),
    }
  )

  // Issue 6: delete calls actual delete, not status=rejected
  const { mutate: remove } = useMutation(
    (id: string) => api.quizzes.delete(id),
    { onSuccess: () => { load(); showToast('Quiz deleted') }, onError: (m) => showToast(m, 'error') }
  )

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (q: any) => {
    setEditing(q)
    setForm({
      title: q.title, subject: q.subject, type: q.type,
      totalQuestions: q.total_questions, durationMins: q.duration_mins,
      passingScore: q.passing_score, coinsReward: q.coins_reward,
      status: q.status, scheduledFor: q.scheduled_for ? q.scheduled_for.split('T')[0] : '',
    })
    setShowModal(true)
  }

  // Question helpers
  const updateQ = (i: number, key: string, val: any) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [key]: val } : q))

  const updateOption = (qi: number, oi: number, val: string) =>
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q
      const opts = [...q.options]; opts[oi] = val; return { ...q, options: opts }
    }))

  const setOptionCount = (qi: number, cnt: number) =>
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q
      const opts = Array(cnt).fill('').map((_, i) => q.options[i] || '')
      const imgs = Array(cnt).fill('').map((_, i) => q.optionImages[i] || '')
      const correct = q.correctOption >= cnt ? 0 : q.correctOption
      return { ...q, options: opts, optionImages: imgs, optionCount: cnt, correctOption: correct }
    }))

  const handleSaveQuestions = () => {
    const valid = questions.filter(q => q.question.trim() && q.options.filter(Boolean).length >= 2)
    if (!valid.length) { showToast('Each question needs text and at least 2 options', 'error'); return }

    // Transform to backend format: optionA/B/C/D + correctOption as letter
    const transformed = valid.map(q => {
      const opts = [...q.options]
      // Pad to 4 options minimum (backend requires A-D)
      while (opts.length < 4) opts.push(opts[opts.length - 1] || opts[0] || 'N/A')
      const letters = ['a', 'b', 'c', 'd', 'e']
      return {
        question:      q.question,
        questionType:  q.questionType || 'text',
        optionA:       opts[0] || '',
        optionB:       opts[1] || '',
        optionC:       opts[2] || '',
        optionD:       opts[3] || '',
        correctOption: letters[q.correctOption ?? 0] || 'a',
        explanation:   q.explanation || '',
      }
    })
    saveQuestions({ id: selectedQuiz.id, qs: transformed })
  }

  const totalPages = Math.ceil(total / LIMIT)

  // Stats — issue 4: from loaded data
  const stats = [
    { label:'Daily',   value:quizzes.filter(q=>q.type==='daily').length, emoji:'🎯', color:'text-purple-600 bg-purple-50' },
    { label:'Topic',   value:quizzes.filter(q=>q.type==='topic').length, emoji:'📚', color:'text-blue-600 bg-blue-50' },
    { label:'Mock',    value:quizzes.filter(q=>q.type==='mock').length,  emoji:'📝', color:'text-orange-600 bg-orange-50' },
    { label:'Attempts (page)', value:formatNumber(quizzes.reduce((a,q)=>a+(q.attempt_count||0),0)), emoji:'👥', color:'text-green-600 bg-green-50' },
  ]

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="Quizzes & Mock Tests" subtitle="Manage all quizzes, topic tests and mock exams" />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`card p-4 flex items-center gap-3 ${s.color.split(' ')[1]}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters — Issue 2: debounced search actually filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search quizzes…" className="input pl-9" />
          </div>
          {/* Issue 1+3: uniform filter pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Filter size={12} className="text-slate-400" />
            <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }}
              className="text-sm bg-transparent outline-none text-slate-700 pr-1">
              <option value="">All Types</option>
              <option value="daily">Daily</option>
              <option value="topic">Topic</option>
              <option value="mock">Mock Test</option>
            </select>
          </div>
          <button onClick={load} className="btn-secondary px-3 py-2" title="Refresh"><RefreshCw size={13} /></button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Quiz</button>
        </div>

        {/* List — Issue 3: card grid instead of table */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-5 animate-pulse h-40"><div className="h-4 bg-slate-100 rounded w-3/4 mb-3"/><div className="h-3 bg-slate-100 rounded w-1/2"/></div>)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card p-16 text-center">
            <HelpCircle size={40} className="mx-auto mb-4 text-slate-200"/>
            <p className="font-bold text-slate-800 text-lg mb-1">No quizzes found</p>
            <p className="text-sm text-slate-400 mb-5">Create your first quiz to get started</p>
            <button onClick={openNew} className="btn-primary mx-auto"><Plus size={14}/> Create Quiz</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quizzes.map(quiz => {
              const meta = TYPE_META[quiz.type] || TYPE_META.topic
              return (
                <div key={quiz.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {/* Type color bar */}
                  <div className={`h-1 w-full ${quiz.type==='daily'?'bg-purple-200':quiz.type==='mock'?'bg-orange-200':'bg-blue-200'}`}/>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Title + badges */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg.replace('100','50')} ${meta.color.replace('700','600')}`}>{meta.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${quiz.status==='published'?'bg-green-50 text-green-700 border-green-200':'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {quiz.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{quiz.title}</h3>
                      {quiz.subject && <p className="text-xs text-slate-500 mt-0.5">{quiz.subject}</p>}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { icon:<BookOpen size={11}/>,  label:'Qs',       value:quiz.total_questions||0 },
                        { icon:<Clock size={11}/>,     label:'Mins',     value:quiz.duration_mins||0 },
                        { icon:<span className="text-[11px]">🪙</span>, label:'Coins', value:quiz.coins_reward||0 },
                        { icon:<Target size={11}/>,    label:'Attempts', value:formatNumber(quiz.attempt_count||0) },
                      ].map(s => (
                        <div key={s.label} className="flex flex-col items-center py-2 bg-slate-50/80 rounded-xl border border-slate-100">
                          <span className="text-slate-400 mb-0.5">{s.icon}</span>
                          <span className="text-xs font-bold text-slate-800">{s.value}</span>
                          <span className="text-[9px] text-slate-400">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Avg score bar */}
                    {(quiz.avg_score > 0) && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-slate-400">Avg Score</span>
                          <span className="text-[10px] font-bold text-slate-700">{parseFloat(quiz.avg_score||0).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{width:`${quiz.avg_score||0}%`}}/>
                        </div>
                      </div>
                    )}

                    <div className="flex-1"/>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-50">
                      <button onClick={() => openQuestions(quiz)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors">
                        <ListPlus size={12}/> Questions
                      </button>
                      <button onClick={() => openEdit(quiz)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors">
                        <Edit size={12}/> Edit
                      </button>
                      <button onClick={() => { if (confirm('Delete this quiz?')) remove(quiz.id) }}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Trash2 size={13} className="text-red-500"/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Issue 1: Pagination */}
        {total > LIMIT && (
          <div className="card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              Showing <b>{Math.min((page-1)*LIMIT+1,total)}</b>–<b>{Math.min(page*LIMIT,total)}</b> of <b>{total}</b>
            </p>
            <div className="flex items-center gap-1.5">
              <button disabled={page===1} onClick={()=>setPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors">«</button>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronLeft size={14}/></button>
              {Array.from({length:Math.min(totalPages,7)},(_,i)=>{const p=totalPages<=7?i+1:page<=4?i+1:page>=totalPages-3?totalPages-6+i:page-3+i;return <button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p===page?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>{p}</button>})}
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronRight size={14}/></button>
              <button disabled={page>=totalPages} onClick={()=>setPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════ CREATE / EDIT QUIZ MODAL ════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white text-lg">{editing ? 'Edit Quiz' : 'Create Quiz'}</h3>
                <p className="text-white/60 text-xs mt-0.5">{editing ? 'Update quiz details' : 'Fill in the details — questions added separately'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Quiz Title *</label>
                <input value={form.title} onChange={e => setForm({...form,title:e.target.value})}
                  className="input w-full" placeholder="e.g. BPSC Polity Practice Set #1" autoFocus />
              </div>

              {/* Type + Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Type</label>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <select value={form.type} onChange={e => setForm({...form,type:e.target.value})}
                      className="text-sm bg-transparent outline-none text-slate-700 w-full">
                      <option value="daily">🎯 Daily Quiz</option>
                      <option value="topic">📚 Topic Quiz</option>
                      <option value="mock">📝 Mock Test</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Subject</label>
                  <input value={form.subject} onChange={e => setForm({...form,subject:e.target.value})}
                    className="input w-full" placeholder="Polity, History…" />
                </div>
              </div>

              {/* Issue 5: Numbers with proper padding selects */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">No. of Questions</label>
                  {/* Issue 7: totalQuestions sets how many Q to add */}
                  <NumInput value={form.totalQuestions} onChange={v => setForm({...form,totalQuestions:v})} min={1} max={200} placeholder="10" />
                  <p className="text-[10px] text-slate-400 mt-1">You'll add this many questions after saving</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Duration (mins)</label>
                  <NumInput value={form.durationMins} onChange={v => setForm({...form,durationMins:v})} min={1} max={180} placeholder="15" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Passing Score %</label>
                  <NumInput value={form.passingScore} onChange={v => setForm({...form,passingScore:v})} min={1} max={100} placeholder="60" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">🪙 Coins Reward</label>
                  <NumInput value={form.coinsReward} onChange={v => setForm({...form,coinsReward:v})} min={0} placeholder="10" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                    className="text-sm bg-transparent outline-none text-slate-700 w-full">
                    <option value="published">Published — visible in app</option>
                    <option value="draft">Draft — hidden</option>
                  </select>
                </div>
              </div>

              {/* Scheduled date for daily */}
              {form.type === 'daily' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Scheduled For</label>
                  <input type="date" value={form.scheduledFor||''} onChange={e => setForm({...form,scheduledFor:e.target.value})} className="input w-full" />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => save({...form, scheduledFor:form.scheduledFor?.trim()||null})}
                disabled={saving || !form.title.trim()}
                className="btn-primary disabled:opacity-40">
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : editing ? 'Update Quiz' : 'Create Quiz →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ QUESTIONS MODAL ════════════════ */}
      {showQModal && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 to-green-500 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white">Questions — {selectedQuiz.title}</h3>
                <p className="text-white/60 text-xs mt-0.5">
                  Target: {selectedQuiz.total_questions} questions ·
                  {existingQuestions.length} existing
                </p>
              </div>
              <button onClick={() => setShowQModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={15} className="text-white"/>
              </button>
            </div>

            {/* Tabs: Issue 10 */}
            <div className="flex border-b border-slate-100 px-6 shrink-0">
              {(['existing','add'] as const).map(t => (
                <button key={t} onClick={() => setQTab(t)}
                  className={`py-3 px-4 text-sm font-semibold border-b-2 -mb-px transition-colors
                    ${qTab===t?'border-brand-500 text-brand-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {t === 'existing'
                    ? `📋 Existing (${loadingQs ? '…' : existingQuestions.length})`
                    : `➕ Add New`}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 p-5">

              {/* Issue 10: Existing questions tab */}
              {qTab === 'existing' && (
                <div className="space-y-3">
                  {loadingQs ? (
                    <div className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-300"/></div>
                  ) : existingQuestions.length === 0 ? (
                    <div className="py-12 text-center">
                      <HelpCircle size={32} className="mx-auto mb-3 text-slate-200"/>
                      <p className="text-slate-400 font-medium">No questions added yet</p>
                      <button onClick={() => setQTab('add')} className="btn-primary mt-3 text-sm">Add Questions →</button>
                    </div>
                  ) : (
                    existingQuestions.map((q: any, i: number) => (
                      <div key={q.id || i} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-400 mb-1">Q{i+1}</p>
                            {q.question_image_url && <img src={q.question_image_url} alt="" className="max-h-20 rounded-xl mb-2 object-contain"/>}
                            <p className="text-sm font-semibold text-slate-800 mb-2">{q.question || q.question_text}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(q.options || [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)).map((opt: string, oi: number) => (
                                <div key={oi} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs
                                  ${oi === (typeof (q.correct_option??q.correctOption)=== 'string' ? ['a','b','c','d','e'].indexOf((q.correct_option??q.correctOption).toLowerCase()) : (q.correct_option??q.correctOption??0))
                                    ? 'bg-green-100 text-green-800 font-semibold border border-green-200'
                                    : 'bg-white text-slate-600 border border-slate-200'}`}>
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
                                    ${oi === (typeof (q.correct_option??q.correctOption)=== 'string' ? ['a','b','c','d','e'].indexOf((q.correct_option??q.correctOption).toLowerCase()) : (q.correct_option??q.correctOption??0)) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {OPTION_LABELS[oi]}
                                  </span>
                                  {opt}
                                </div>
                              ))}
                            </div>
                            {(q.explanation || q.hint) && (
                              <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                                💡 Hint: {q.explanation || q.hint}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add questions tab — Issue 11: better UI */}
              {qTab === 'add' && (
                <div className="space-y-5">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-2xl border-2 border-slate-200 overflow-hidden">

                      {/* Q header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 text-xs font-black flex items-center justify-center">{i+1}</div>
                          <span className="text-sm font-bold text-slate-700">Question {i+1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Issue 13: option count picker */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-medium">Options:</span>
                            {[2,3,4].map(n => (
                              <button key={n} onClick={() => setOptionCount(i, n)}
                                className={`w-6 h-6 rounded-md text-xs font-bold transition-colors
                                  ${q.optionCount===n?'bg-brand-500 text-white':'text-slate-500 hover:bg-slate-100'}`}>
                                {n}
                              </button>
                            ))}
                          </div>
                          {questions.length > 1 && (
                            <button onClick={() => setQuestions(prev => prev.filter((_,idx) => idx!==i))}
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center">
                              <X size={13} className="text-red-500"/>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Question text */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">Question Text *</label>
                          <textarea value={q.question} onChange={e => updateQ(i,'question',e.target.value)}
                            className="input resize-none h-16" placeholder="Type the question here…"/>
                        </div>

                        {/* Options — Issue 13: dynamic count */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">Answer Options</label>
                          <div className="space-y-2">
                            {q.options.map((opt: string, oi: number) => (
                              <div key={oi} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors
                                ${q.correctOption===oi?'border-green-400 bg-green-50':'border-transparent bg-slate-50'}`}>
                                <button onClick={() => updateQ(i,'correctOption',oi)}
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors
                                    ${q.correctOption===oi?'bg-green-500 text-white':'bg-white border-2 border-slate-200 text-slate-500 hover:border-green-400'}`}>
                                  {OPTION_LABELS[oi]}
                                </button>
                                <input value={opt} onChange={e => updateOption(i, oi, e.target.value)}
                                  className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                                  placeholder={`Option ${OPTION_LABELS[oi]}…`}/>
                                {q.correctOption === oi && (
                                  <span className="text-[10px] font-bold text-green-600 shrink-0">✓ Correct</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">Click the letter button to mark the correct answer</p>
                        </div>

                        {/* Issue 14: Explanation = hint shown in app */}
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">
                            Hint / Explanation
                            <span className="ml-1 text-blue-500 font-normal">(shown in app after answering)</span>
                          </label>
                          <input value={q.explanation} onChange={e => updateQ(i,'explanation',e.target.value)}
                            className="input" placeholder="Brief explanation of why the answer is correct…"/>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={() => setQuestions(prev => [...prev, emptyQ()])}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/30 transition-all font-semibold">
                    + Add Another Question
                  </button>
                </div>
              )}
            </div>

            {qTab === 'add' && (
              <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <p className="text-xs text-slate-400">{questions.filter(q=>q.question.trim()).length} / {questions.length} questions filled</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowQModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleSaveQuestions} disabled={savingQ}
                    className="btn-primary disabled:opacity-40">
                    {savingQ ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : `Save ${questions.filter(q=>q.question.trim()).length} Questions`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}