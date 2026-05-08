'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import {
  Search, Plus, Edit, Trash2, RefreshCw, Brain,
  ChevronDown, RotateCcw, Eye, Download, Upload,
  AlertCircle, Check, X, Filter
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const SUBJECTS = ['Polity', 'History', 'Geography', 'Economy', 'Bihar GK', 'Science', 'Environment', 'General']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const EXAM_TAGS = ['BPSC 70th CCE', 'BPSC 71st CCE', 'Bihar Police SI', 'Bihar Constable', 'BPSC Teacher', 'UPSC CSE', 'SSC CGL']

const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-green-50 text-green-700 border-green-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  hard:   'bg-red-50 text-red-700 border-red-100',
}
const SUBJECT_EMOJI: Record<string, string> = {
  Polity: '⚖️', History: '🏛️', Geography: '🗺️', Economy: '💰',
  'Bihar GK': '🏔️', Science: '🔬', Environment: '🌿', General: '📚',
}

const emptyForm = {
  front: '', back: '', subject: 'Polity', difficulty: 'medium',
  examTags: ['BPSC 70th CCE'], isActive: true,
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [list, setList]             = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterSubject, setFilter]  = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [form, setForm]             = useState<any>(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState<any>(null)
  const [previewFlipped, setFlipped]= useState(false)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importResult, setImportResult] = useState<{ok:number,fail:number}|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.flashcards.list({ subject: filterSubject, limit: 200 })
      setList(res.data?.flashcards || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filterSubject])

  // ── Filtered list ──────────────────────────────────────────
  const filtered = list.filter(c => {
    const matchSearch = !search ||
      c.front?.toLowerCase().includes(search.toLowerCase()) ||
      c.back?.toLowerCase().includes(search.toLowerCase())
    const matchDiff = !filterDiff || c.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  // ── Stats ──────────────────────────────────────────────────
  const stats = [
    { label: 'Total Cards',  value: list.length,                                 emoji: '🃏' },
    { label: 'Subjects',     value: Array.from(new Set(list.map(c => c.subject))).length, emoji: '📚' },
    { label: 'Easy',         value: list.filter(c => c.difficulty === 'easy').length,   emoji: '🟢' },
    { label: 'Hard',         value: list.filter(c => c.difficulty === 'hard').length,   emoji: '🔴' },
  ]

  // ── CRUD ──────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      front: c.front || c.question || '',
      back:  c.back  || c.answer  || '',
      subject:    c.subject,
      difficulty: c.difficulty,
      examTags:   c.exam_tags || [],
      isActive:   c.is_active !== false,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.front.trim() || !form.back.trim()) {
      alert('Both question (front) and answer (back) are required.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, front: form.front.trim(), back: form.back.trim() }
      if (editing) await api.flashcards.update(editing.id, payload)
      else         await api.flashcards.create(payload)
      setShowModal(false)
      load()
    } catch (e: any) { alert(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const del = async (id: string, front: string) => {
    if (!confirm(`Delete this flashcard?\n"${front.slice(0,80)}..."`)) return
    try { await api.flashcards.delete(id); load() }
    catch (e: any) { alert(e.message || 'Failed to delete') }
  }

  // ── Bulk CSV/Text import ───────────────────────────────────
  // Format: FRONT | BACK | SUBJECT | DIFFICULTY
  //         e.g. What is Article 17? | Abolishes untouchability | Polity | easy
  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'))
    if (!lines.length) { alert('No valid lines found.'); return }
    setImporting(true)
    let ok = 0, fail = 0
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 2) { fail++; continue }
      const [front, back, subject = 'General', difficulty = 'medium'] = parts
      if (!front || !back) { fail++; continue }
      try {
        await api.flashcards.create({
          front, back,
          subject: SUBJECTS.includes(subject) ? subject : 'General',
          difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : 'medium',
          examTags: ['BPSC 70th CCE'],
          isActive: true,
        })
        ok++
      } catch { fail++ }
    }
    setImporting(false)
    setImportResult({ ok, fail })
    if (ok > 0) { load(); setImportText('') }
  }

  // ── Export ─────────────────────────────────────────────────
  const handleExport = () => {
    const csv = ['# Front | Back | Subject | Difficulty', ...list.map(c =>
      `${c.front || c.question} | ${c.back || c.answer} | ${c.subject} | ${c.difficulty}`
    )].join('\n')
    const blob = new Blob([csv], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `flashcards-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  // ── Subject group counts ───────────────────────────────────
  const subjectCounts = SUBJECTS.reduce((acc, s) => {
    acc[s] = list.filter(c => c.subject === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen">
      <Header
        title="Flashcards — Active Recall"
        subtitle="Create study cards for the Active Recall feature in the Android app"
      />

      <div className="p-6 space-y-5 animate-fade-in">

        {/* What is Active Recall — explained for admin */}
        <div className="card p-4 border-l-4 border-brand-500 bg-blue-50">
          <div className="flex gap-3">
            <Brain className="text-brand-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-slate-900 text-sm">What is Active Recall?</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Students see the <strong>question (front)</strong>, try to recall the answer from memory,
                then flip the card to see the <strong>answer (back)</strong>. Cards are organised
                by subject. Students can mark cards as <em>Mastered</em> ✅ or <em>Needs More Practice</em> 🔄.
                This is proven to be the most effective memorisation technique for competitive exams.
              </p>
              <p className="text-xs text-brand-700 font-medium mt-2">
                💡 Add at least 5–10 cards per subject so students have meaningful sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
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

        {/* Subject breakdown */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Cards per Subject</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(filterSubject === s ? '' : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${filterSubject === s
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                  }`}
              >
                <span>{SUBJECT_EMOJI[s]}</span>
                <span>{s}</span>
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${filterSubject === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {subjectCounts[s] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search question or answer..." className="input pl-9" />
          </div>
          <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} className="input w-auto">
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
          </select>
          <button onClick={load} className="btn-secondary"><RefreshCw size={14} /></button>
          <button onClick={() => setShowImport(!showImport)} className="btn-secondary">
            <Upload size={14} /> Bulk Import
          </button>
          <button onClick={handleExport} className="btn-secondary" disabled={!list.length}>
            <Download size={14} /> Export
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus size={14} /> Add Flashcard
          </button>
        </div>

        {/* Bulk Import Panel */}
        {showImport && (
          <div className="card p-5 space-y-3 border-2 border-dashed border-brand-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Bulk Import Flashcards</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  One card per line: <code className="bg-slate-100 px-1 rounded">Question | Answer | Subject | Difficulty</code>
                </p>
              </div>
              <button onClick={() => { setShowImport(false); setImportResult(null) }} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={8}
              className="input font-mono text-xs"
              placeholder={`# Lines starting with # are ignored\nWhich article abolishes untouchability? | Article 17 abolishes untouchability | Polity | easy\nWho founded the Maurya Empire? | Chandragupta Maurya (322 BCE) with Chanakya's help | History | easy\nWhat is Repo Rate? | Rate at which RBI lends to commercial banks. Controls inflation. | Economy | medium`}
            />

            {importResult && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${importResult.fail === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {importResult.fail === 0 ? <Check size={16}/> : <AlertCircle size={16}/>}
                <span>
                  ✅ {importResult.ok} imported successfully
                  {importResult.fail > 0 && ` · ❌ ${importResult.fail} failed (check format)`}
                </span>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!importText.trim() || importing}
              className="btn-primary"
            >
              {importing ? 'Importing...' : `Import ${importText.trim().split('\n').filter(l => l.trim() && !l.startsWith('#')).length} Cards`}
            </button>
          </div>
        )}

        {/* Cards list */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-16 flex flex-col items-center gap-3 text-center">
            <Brain size={40} className="text-slate-200" />
            <p className="font-semibold text-slate-900">No flashcards yet</p>
            <p className="text-sm text-slate-500 max-w-xs">
              {list.length === 0
                ? 'Add your first flashcard to get started. Students will see these in the Active Recall screen.'
                : 'No cards match the current filter. Try adjusting your search or filter.'
              }
            </p>
            {list.length === 0 && (
              <button onClick={openNew} className="btn-primary mt-2">
                <Plus size={14} /> Add First Flashcard
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 px-1">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map(card => (
                <div key={card.id}
                  className={`card p-4 hover:shadow-md transition-all ${card.is_active === false ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-lg">
                      {SUBJECT_EMOJI[card.subject] || '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge text-[10px] ${DIFF_COLORS[card.difficulty]}`}>
                              {card.difficulty}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{card.subject}</span>
                            {card.is_active === false && (
                              <span className="badge bg-slate-100 text-slate-500 border-slate-200 text-[10px]">hidden</span>
                            )}
                          </div>

                          {/* Front (question) */}
                          <div className="mb-2">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Question</p>
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                              {card.front || card.question}
                            </p>
                          </div>

                          {/* Back (answer) */}
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Answer</p>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {card.back || card.answer}
                            </p>
                          </div>

                          {/* Exam tags */}
                          {card.exam_tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(card.exam_tags || []).slice(0, 2).map((t: string) => (
                                <span key={t} className="badge bg-blue-50 text-blue-600 border-blue-100 text-[10px]">{t}</span>
                              ))}
                              {card.exam_tags?.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{card.exam_tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => { setPreview(card); setFlipped(false) }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                            title="Preview card"
                          >
                            <Eye size={12} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => openEdit(card)}
                            className="w-7 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 flex items-center justify-center transition-colors"
                          >
                            <Edit size={12} className="text-yellow-600" />
                          </button>
                          <button
                            onClick={() => del(card.id, card.front || card.question || '')}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Card Preview Modal ─────────────────────────────────── */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-blue-900 to-blue-600 p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">Card Preview</p>
                <p className="text-white/70 text-xs">As seen in the Android app</p>
              </div>
              <button onClick={() => setPreview(null)}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                <X size={14} />
              </button>
            </div>
            <div className="p-6">
              {/* Flashcard preview */}
              <div
                className="border-2 border-slate-200 rounded-2xl p-6 min-h-[180px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-400 transition-all"
                onClick={() => setFlipped(!previewFlipped)}
              >
                {!previewFlipped ? (
                  <>
                    <div className="text-3xl mb-3">{SUBJECT_EMOJI[preview.subject] || '📚'}</div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Question (Front)</p>
                    <p className="font-bold text-slate-900 text-base leading-snug">{preview.front || preview.question}</p>
                    <p className="text-xs text-slate-400 mt-4">Tap to reveal answer</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-3">✅</div>
                    <p className="text-[10px] text-green-500 uppercase tracking-wider mb-2">Answer (Back)</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{preview.back || preview.answer}</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <div className={`badge text-xs ${DIFF_COLORS[preview.difficulty]}`}>{preview.difficulty}</div>
                <div className="badge bg-slate-100 text-slate-600 border-slate-200 text-xs">{preview.subject}</div>
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">Click card to flip</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">
                  {editing ? 'Edit Flashcard' : 'New Flashcard'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {editing ? 'Update this study card' : 'Add a new study card for Active Recall'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* Subject + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject *</label>
                  <select value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="input">
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{SUBJECT_EMOJI[s]} {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Difficulty *</label>
                  <select value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    className="input">
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d.charAt(0).toUpperCase()+d.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Front (Question) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Question (Front of card) *
                </label>
                <textarea
                  value={form.front}
                  onChange={e => setForm({ ...form, front: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="e.g. Which article of the Indian Constitution abolishes untouchability?"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Keep questions clear and specific. Avoid vague questions.
                </p>
              </div>

              {/* Back (Answer) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Answer (Back of card) *
                </label>
                <textarea
                  value={form.back}
                  onChange={e => setForm({ ...form, back: e.target.value })}
                  rows={4}
                  className="input"
                  placeholder="e.g. Article 17 abolishes untouchability and forbids its practice in any form. The enforcement of any disability arising from untouchability is an offence."
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Include context and examples. A detailed answer helps students understand, not just memorise.
                </p>
              </div>

              {/* Exam Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Relevant Exams</label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TAGS.map(tag => {
                    const sel = (form.examTags || []).includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = form.examTags || []
                          setForm({
                            ...form,
                            examTags: sel
                              ? current.filter((t: string) => t !== tag)
                              : [...current, tag]
                          })
                        }}
                        className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-all
                          ${sel
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                          }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700 font-medium cursor-pointer">
                  Visible to students (uncheck to hide without deleting)
                </label>
              </div>

              {/* Live preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 px-3 py-2 border-b border-slate-200">
                  Live Preview
                </p>
                <div className="p-4 flex gap-3">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-slate-400 uppercase mb-1">Front</p>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-3">
                      {form.front || <span className="text-slate-300 italic">Question will appear here</span>}
                    </p>
                  </div>
                  <div className="text-slate-300 self-center text-lg">→</div>
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-green-500 uppercase mb-1">Back</p>
                    <p className="text-xs text-slate-700 line-clamp-3">
                      {form.back || <span className="text-slate-300 italic">Answer will appear here</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !form.front.trim() || !form.back.trim()}
                className="flex-1 btn-primary">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Flashcard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
