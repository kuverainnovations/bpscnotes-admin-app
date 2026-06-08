'use client'
// NOTE: install xlsx for Excel support: npm install xlsx
// CSV files work without it — built-in parser used automatically

import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useMutation, useDebounce } from '@/lib/hooks'
import { useToast } from '@/components/ui/feedback'
import { formatNumber } from '@/lib/utils'
import DynamicSelect from '@/components/ui/DynamicSelect'
import {
  Search, Plus, Edit, Trash2, HelpCircle, RefreshCw,
  ChevronLeft, ChevronRight,
  X, Check, Layers, Clock, Coins, Target, BookOpen,
  ListPlus, Eye, AlertCircle, CheckCircle2, Filter,
  ChevronDown, Pencil, Loader2, Upload, FileSpreadsheet, Download, AlertTriangle,
} from 'lucide-react'

const LIMIT = 15

const TYPE_META: Record<string,{label:string;color:string;bg:string}> = {
  daily: { label:'Daily',      color:'text-purple-700', bg:'bg-purple-100 border-purple-200' },
  topic: { label:'Topic',      color:'text-blue-700',   bg:'bg-blue-100 border-blue-200' },
  mock:  { label:'Mock Test',  color:'text-orange-700', bg:'bg-orange-100 border-orange-200' },
}

const OPTION_LABELS = ['A','B','C','D','E']
const LETTER_TO_IDX: Record<string,number> = { a:0, b:1, c:2, d:3, e:4 }
const normCorrect = (v: any): number => {
  if (typeof v === 'number') return Math.min(v, 3)
  if (typeof v === 'string') return LETTER_TO_IDX[v.toLowerCase()] ?? 0
  return 0
}

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

// ─── Download the same .xlsx template that matches the upload format ─────────
async function downloadTemplate() {
  let XLSX: any = null
  try { XLSX = await (new Function('return import("xlsx")')()) } catch { alert('xlsx package not loaded. Try refreshing the page.'); return }

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Quiz Info ──────────────────────────────────────
  const infoRows = [
    ['Field', 'Your Value  ← Fill here', 'Allowed values / notes'],
    ['title *',       'BPSC Polity Practice Set — 100 MCQs',  'Required. Quiz name shown in the app.'],
    ['subject *',     'Polity',                               'Required. e.g. Polity, History, Bihar GK, Economy'],
    ['type',          'topic',                                'topic  /  mock  /  daily   (default: topic)'],
    ['duration_mins', '60',                                   'Duration in minutes  (default: 15)'],
    ['passing_score', '60',                                   'Pass percentage threshold  (default: 60)'],
    ['coins_reward',  '20',                                   'Coins given on completion  (default: 10)'],
    ['status',        'published',                            'published  (live in app)  or  draft  (hidden)'],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows)
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 38 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Quiz Info')

  // ── Sheet 2: Quiz Questions ─────────────────────────────────
  const qRows = [
    ['question *', 'option_a *', 'option_b *', 'option_c', 'option_d', 'option_e', 'correct_option *', 'explanation', 'subject'],
    // 20 sample BPSC questions
    ['What is the capital of Bihar?', 'Patna', 'Ranchi', 'Gaya', 'Muzaffarpur', '', 'a', 'Patna has been the capital of Bihar since ancient times.', 'Bihar GK'],
    ['Who was the first Chief Minister of Bihar?', 'Shri Krishna Sinha', 'Anugrah Narayan Sinha', 'Binodanand Jha', 'Mahamaya Prasad Sinha', '', 'a', 'Sri Krishna Sinha became the first CM of Bihar in 1946.', 'Bihar GK'],
    ['Which river flows through Patna?', 'Ganga', 'Yamuna', 'Godavari', 'Kaveri', '', 'a', 'The Ganga river flows through Patna.', 'Geography'],
    ['Article 370 was related to which state?', 'Jammu & Kashmir', 'Himachal Pradesh', 'Uttarakhand', 'Sikkim', '', 'a', 'Article 370 granted special status to J&K, abrogated in 2019.', 'Polity'],
    ['Fundamental Rights are in which Part of the Constitution?', 'Part III', 'Part IV', 'Part II', 'Part V', '', 'a', 'Part III (Articles 12–35) contains Fundamental Rights.', 'Polity'],
    ['Full form of BPSC?', 'Bihar Public Service Commission', 'Bihar Police Service Commission', 'Bengal Public Service Commission', 'Bihar Provincial Committee', '', 'a', 'BPSC = Bihar Public Service Commission.', 'General Studies'],
    ['Photosynthesis occurs in which organelle?', 'Chloroplast', 'Mitochondria', 'Nucleus', 'Ribosome', '', 'a', 'Chloroplasts contain chlorophyll used in photosynthesis.', 'Science & Technology'],
    ['Who is known as the Iron Man of India?', 'Sardar Vallabhbhai Patel', 'Subhas Chandra Bose', 'Bal Gangadhar Tilak', 'Lal Bahadur Shastri', '', 'a', 'Sardar Patel unified the princely states.', 'History'],
    ['Which Five Year Plan focused on poverty alleviation?', 'Fifth', 'First', 'Third', 'Seventh', '', 'a', 'The Fifth FYP (1974–79) focused on poverty alleviation.', 'Economy'],
    ['Directive Principles borrowed from which country?', 'Ireland', 'USA', 'UK', 'Australia', '', 'a', 'Directive Principles borrowed from the Irish Constitution.', 'Polity'],
    ['Which Amendment gave constitutional status to Panchayati Raj?', '73rd', '42nd', '44th', '86th', '', 'a', 'The 73rd Constitutional Amendment (1992).', 'Polity'],
    ['CRR stands for?', 'Cash Reserve Ratio', 'Credit Reserve Rate', 'Central Reserve Ratio', 'Cash Return Rate', '', 'a', 'CRR is the minimum cash banks must hold with RBI.', 'Economy'],
    ['Longest river flowing entirely within India?', 'Ganga', 'Godavari', 'Brahmaputra', 'Krishna', '', 'a', 'The Ganga is the longest river flowing entirely within India.', 'Geography'],
    ['Article 21A provides for?', 'Right to Education', 'Right to Life', 'Right to Property', 'Right to Work', '', 'a', 'Article 21A (86th Amendment) — free education for children 6–14.', 'Polity'],
    ['GST was implemented in India from?', '1 July 2017', '1 April 2016', '1 January 2018', '26 January 2017', '', 'a', 'GST was rolled out on 1 July 2017.', 'Economy'],
    ['Father of the Indian Constitution?', 'B.R. Ambedkar', 'Jawaharlal Nehru', 'Mahatma Gandhi', 'Sardar Patel', '', 'a', 'Dr B.R. Ambedkar chaired the Drafting Committee.', 'Polity'],
    ['Planet closest to the Sun?', 'Mercury', 'Venus', 'Earth', 'Mars', '', 'a', 'Mercury is the closest planet to the Sun.', 'Science & Technology'],
    ['Sarnath is associated with which religion?', 'Buddhism', 'Hinduism', 'Jainism', 'Sikhism', '', 'a', 'Buddha delivered his first sermon at Sarnath.', 'History'],
    ['Most abundant gas in Earth\'s atmosphere?', 'Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Argon', '', 'a', 'Nitrogen makes up about 78% of Earth\'s atmosphere.', 'Science & Technology'],
    ['Who wrote Arthashastra?', 'Chanakya', 'Ashoka', 'Chandragupta', 'Vikramaditya', '', 'a', 'Chanakya (Kautilya) wrote the Arthashastra.', 'History'],
  ]
  const wsQ = XLSX.utils.aoa_to_sheet(qRows)
  wsQ['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsQ, 'Quiz Questions')

  // Download
  XLSX.writeFile(wb, 'quiz_bulk_upload_template.xlsx')
}

// ─── Parse uploaded CSV/Excel into question rows ──────────────
function parseCSV(text: string): any[][] {
  const rows: any[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = '' }
      else cur += ch
    }
    cols.push(cur)
    rows.push(cols.map(c => c.replace(/^"|"$/g, '').trim()))
  }
  return rows
}

// Extract quiz metadata from a sheet named "Quiz Info" (key-value pairs in col A/B)
function extractMetaFromSheet(XLSX: any, wb: any): Record<string,string> {
  const infoSheet = wb.Sheets['Quiz Info'] || wb.Sheets['quiz_info'] || wb.Sheets['QuizInfo']
  if (!infoSheet) return {}
  const rows: any[][] = XLSX.utils.sheet_to_json(infoSheet, { header: 1, defval: '' })
  const meta: Record<string,string> = {}
  for (const row of rows) {
    const key = String(row[0] || '').trim().toLowerCase().replace(/\s+/g,'_')
    const val = String(row[1] || '').trim()
    if (key && val) meta[key] = val
  }
  return meta
}

async function parseFile(file: File): Promise<{ questions: any[]; quizMeta: Record<string,string> }> {
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  let rows: any[][]
  let quizMeta: Record<string,string> = {}

  if (!isCsv) {
    let XLSX: any = null
    try { XLSX = await (new Function('return import("xlsx")')()) } catch { /* not installed */ }
    if (!XLSX) throw new Error('.xlsx/.xls requires the xlsx package.\nRun: npm install xlsx\nOr upload a .csv file instead.')
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    // Try to read quiz info from dedicated sheet
    quizMeta = extractMetaFromSheet(XLSX, wb)
  } else {
    rows = parseCSV(await file.text())
  }

  if (rows.length < 2) throw new Error('File is empty or has no data rows')

  const headers: string[] = (rows[0] as any[]).map((h: any) =>
    String(h).trim().toLowerCase().replace(/\s+/g, '_')
  )

  // Check if first data row is a __quiz__ metadata row
  const firstRow: any = {}
  headers.forEach((h, j) => { firstRow[h] = String((rows[1] as any[])[j] ?? '').trim() })
  const dataStartIdx = firstRow['question']?.toLowerCase() === '__quiz__' ? 2 : 1

  // If no dedicated sheet, try to read quiz meta from __quiz__ row
  if (Object.keys(quizMeta).length === 0 && dataStartIdx === 2) {
    Object.assign(quizMeta, firstRow)
  }

  const questions: any[] = []
  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i] as any[]
    if (row.every((c: any) => !String(c).trim())) continue
    const obj: any = {}
    headers.forEach((h, j) => { obj[h] = String(row[j] ?? '').trim() })
    questions.push(obj)
  }
  return { questions, quizMeta }
}

// ─── Bulk Upload Modal ────────────────────────────────────────
function BulkQuizUpload({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<'upload'|'preview'|'done'>('upload')
  const [questions, setQuestions] = useState<any[]>([])
  const [parseError, setParseError] = useState<string|null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [meta, setMeta] = useState({
    title: '', subject: '', type: 'topic',
    durationMins: 15, passingScore: 60, coinsReward: 10, status: 'published',
  })

  // Column header aliases accepted
  const FIELD_MAP: Record<string,string> = {
    question:'question', question_text:'question', q:'question',
    option_a:'option_a', a:'option_a', opt_a:'option_a',
    option_b:'option_b', b:'option_b', opt_b:'option_b',
    option_c:'option_c', c:'option_c', opt_c:'option_c',
    option_d:'option_d', d:'option_d', opt_d:'option_d',
    option_e:'option_e', e:'option_e', opt_e:'option_e',
    correct_option:'correct_option', answer:'correct_option', correct:'correct_option',
    explanation:'explanation', hint:'explanation',
    subject:'subject',
  }

  const normalise = (rows: any[]) =>
    rows.map(r => {
      const out: any = {}
      Object.entries(r).forEach(([k, v]) => {
        const mapped = FIELD_MAP[k.toLowerCase().replace(/\s+/g,'_')]
        if (mapped) out[mapped] = v
      })
      return out
    })

  const handleFile = async (file: File) => {
    setParseError(null)
    try {
      const { questions: raw, quizMeta } = await parseFile(file)
      const norm = normalise(raw)
      if (norm.length === 0) throw new Error('No valid rows found')
      if (norm.length > 500) throw new Error('Maximum 500 questions per upload')
      setQuestions(norm)
      // Auto-fill quiz metadata from sheet — no manual step needed
      const TYPE_MAP: Record<string,string> = { topic:'topic', mock:'mock', daily:'daily', 'mock test':'mock' }
      setMeta(m => ({
        ...m,
        title:        quizMeta['title']        || quizMeta['quiz_title']                                  || m.title,
        subject:      quizMeta['subject']       || norm[0]?.subject                                        || m.subject,
        type:         TYPE_MAP[String(quizMeta['type'] || '').toLowerCase()]                               || m.type,
        durationMins: parseInt(quizMeta['duration_mins'] || quizMeta['duration'] || '0') || m.durationMins,
        passingScore: parseInt(quizMeta['passing_score'] || quizMeta['pass_score'] || '0') || m.passingScore,
        coinsReward:  parseInt(quizMeta['coins_reward']  || quizMeta['coins']     || '0') || m.coinsReward,
        status:       quizMeta['status'] || m.status,
      }))
      setStep('preview')
    } catch (e: any) {
      setParseError(e.message || 'Failed to parse file')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const submit = async () => {
    if (!meta.title.trim() || !meta.subject.trim()) return
    setImporting(true)
    try {
      const res = await (api.quizzes as any).bulkImport({ quiz: meta, questions })
      setResult(res.data)
      setStep('done')
      onSuccess()
    } catch (e: any) {
      setParseError(e.message || 'Import failed')
      setImporting(false)
    }
  }

  // Validation preview — count errors
  const LETTERS = ['a','b','c','d','e']
  const errors = questions.map((q, i) => {
    const msgs: string[] = []
    if (!q.question) msgs.push('question missing')
    const opts = [q.option_a, q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean)
    if (opts.length < 2) msgs.push('need ≥ 2 options')
    const co = String(q.correct_option || '').toLowerCase()
    if (!LETTERS.includes(co) && !['1','2','3','4','5'].includes(co))
      msgs.push('correct_option invalid')
    return { row: i + 2, msgs }
  }).filter(e => e.msgs.length > 0)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 rounded-t-3xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg leading-none">Bulk Quiz Import</h2>
              <p className="text-white/70 text-xs mt-1">Upload Excel / CSV · max 500 questions</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={15} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div>
                  <p className="font-semibold text-blue-800 text-sm">📋 Download Template First</p>
                  <p className="text-xs text-blue-600 mt-0.5">Fill in the .xlsx template (Quiz Info + Questions sheets) and upload it back</p>
                </div>
                <button onClick={() => downloadTemplate()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
                  <Download size={13} /> Download .xlsx
                </button>
              </div>

              {/* Column reference */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-700">Column Reference</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ['question *','The question text'],
                    ['option_a *','First option'],
                    ['option_b *','Second option'],
                    ['option_c','Third option (optional)'],
                    ['option_d','Fourth option (optional)'],
                    ['option_e','Fifth option (optional)'],
                    ['correct_option *','a / b / c / d / e  or  1 / 2 / 3 / 4'],
                  ].map(([col, desc]) => (
                    <div key={col} className="flex gap-1.5">
                      <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-700 font-mono shrink-0">{col}</code>
                      <span className="text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                  ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}`}
              >
                <Upload size={32} className="text-slate-300" />
                <p className="font-semibold text-slate-600">Drop your Excel / CSV file here</p>
                <p className="text-xs text-slate-400">.xlsx  .xls  .csv  · max 500 rows</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertTriangle size={14} className="shrink-0" /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800">{questions.length} questions parsed
                  <span className="ml-2 text-xs font-normal text-slate-400">— click any cell to edit, or delete rows</span>
                </p>
                {errors.length > 0 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    <AlertTriangle size={11} /> {errors.length} row{errors.length > 1 ? 's' : ''} with errors
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <CheckCircle2 size={11} /> All rows valid
                  </span>
                )}
              </div>

              {/* Error list */}
              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 max-h-24 overflow-y-auto">
                  {errors.map(e => (
                    <p key={e.row} className="text-xs text-red-700">
                      <span className="font-bold">Row {e.row}:</span> {e.msgs.join(', ')}
                    </p>
                  ))}
                </div>
              )}

              {/* Editable preview table */}
              <div className="overflow-auto rounded-2xl border border-slate-200 max-h-96">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2.5 text-left font-bold text-slate-500 w-8">#</th>
                      {['Question *','A *','B *','C','D','E','✓ *','Explanation','Subject',''].map(h => (
                        <th key={h} className="px-2 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => {
                      const hasError = errors.some(e => e.row === i + 2)
                      const updateField = (field: string, val: string) =>
                        setQuestions(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
                      const deleteRow = () =>
                        setQuestions(prev => prev.filter((_, idx) => idx !== i))

                      const cell = (field: string, placeholder = '', wide = false) => (
                        <td key={field} className={`p-0 border-r border-slate-100 ${wide ? 'min-w-48' : 'min-w-24'}`}>
                          <input
                            value={q[field] || ''}
                            onChange={e => updateField(field, e.target.value)}
                            placeholder={placeholder}
                            className={`w-full px-2 py-1.5 text-xs bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded
                              ${field === 'correct_option' ? 'font-bold text-emerald-700 text-center uppercase w-12' : 'text-slate-700'}
                              ${hasError && !q[field] ? 'bg-red-50 placeholder:text-red-300' : ''}`}
                          />
                        </td>
                      )

                      return (
                        <tr key={i} className={`border-b border-slate-100 group ${hasError ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-2 py-1.5 text-slate-400 font-mono text-center">{i + 1}</td>
                          {cell('question',     'Question text…', true)}
                          {cell('option_a',     'Option A…')}
                          {cell('option_b',     'Option B…')}
                          {cell('option_c',     'Option C')}
                          {cell('option_d',     'Option D')}
                          {cell('option_e',     'Option E')}
                          {cell('correct_option','a/b/c')}
                          {cell('explanation',  'Explanation…', true)}
                          {cell('subject',      'Subject')}
                          <td className="px-2 py-1.5">
                            <button
                              onClick={deleteRow}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all"
                              title="Delete row"
                            >
                              <X size={11} className="text-red-400" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              <button
                onClick={() => setQuestions(prev => [...prev, { question:'', option_a:'', option_b:'', option_c:'', option_d:'', option_e:'', correct_option:'a', explanation:'', subject: meta.subject || '' }])}
                className="w-full py-2 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-200 transition-colors font-semibold"
              >
                <Plus size={12} /> Add Row
              </button>

              {/* Quiz info summary — auto-filled from sheet, editable inline */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Quiz Details — from your sheet</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Title *</label>
                    <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                      placeholder="Quiz title (from sheet or type here)" className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subject *</label>
                    <input value={meta.subject} onChange={e => setMeta(m => ({ ...m, subject: e.target.value }))}
                      placeholder="Subject" className="input text-sm w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Type</label>
                    <select value={meta.type} onChange={e => setMeta(m => ({ ...m, type: e.target.value }))} className="input text-sm w-full">
                      <option value="topic">Topic</option>
                      <option value="mock">Mock Test</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Duration (mins)</label>
                    <input type="number" value={meta.durationMins} onChange={e => setMeta(m => ({ ...m, durationMins: +e.target.value }))}
                      className="input text-sm w-full" min={1} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Passing Score (%)</label>
                    <input type="number" value={meta.passingScore} onChange={e => setMeta(m => ({ ...m, passingScore: +e.target.value }))}
                      className="input text-sm w-full" min={1} max={100} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Coins Reward</label>
                    <input type="number" value={meta.coinsReward} onChange={e => setMeta(m => ({ ...m, coinsReward: +e.target.value }))}
                      className="input text-sm w-full" min={0} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Status</label>
                    <select value={meta.status} onChange={e => setMeta(m => ({ ...m, status: e.target.value }))} className="input text-sm w-full">
                      <option value="published">Published — live</option>
                      <option value="draft">Draft — hidden</option>
                    </select>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertTriangle size={14} className="shrink-0" /> {parseError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => { setStep('upload'); setQuestions([]) }} className="btn-secondary text-sm">← Re-upload</button>
                <button onClick={submit}
                  disabled={importing || !meta.title.trim() || !meta.subject.trim()}
                  className="btn-primary text-sm disabled:opacity-40 min-w-44">
                  {importing
                    ? <><Loader2 size={14} className="animate-spin" /> Importing {questions.length} questions…</>
                    : <><Upload size={14} /> Import {questions.length} Questions</>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-800">Import Successful!</p>
                <p className="text-slate-500 mt-1">
                  <span className="font-bold text-emerald-600">{result.questionsInserted}</span> questions added to
                  <span className="font-bold text-slate-700"> "{result.title}"</span>
                </p>
              </div>
              <button onClick={onClose} className="btn-primary mt-2">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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
  const [showBulk, setShowBulk]     = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null)
  const [form, setForm]             = useState<any>(EMPTY_FORM)
  const [questions, setQuestions]   = useState<any[]>([emptyQ()])

  // Issue 10: existing questions for edit
  const [existingQuestions, setExistingQuestions] = useState<any[]>([])
  const [loadingQs, setLoadingQs]   = useState(false)
  const [editingQId, setEditingQId] = useState<string|null>(null)
  const [editQForm, setEditQForm]   = useState<any>(null)
  const [savingQ2, setSavingQ2]     = useState(false)
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
      while (opts.length < 4) opts.push('')  // pad with empty, NOT duplicating last option
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
          <button onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
            <FileSpreadsheet size={14} /> Bulk Import
          </button>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Quiz</button>
        </div>

        {showBulk && (
          <BulkQuizUpload
            onClose={() => setShowBulk(false)}
            onSuccess={() => { load(); setShowBulk(false) }}
          />
        )}

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
                  <DynamicSelect type="subjects" value={form.subject} onChange={v => setForm({...form,subject:v})} placeholder="Select Subject" />
                </div>
              </div>

              {/* Issue 5: Numbers with proper padding selects */}
              <div className="grid grid-cols-2 gap-3">
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
                    existingQuestions.map((q: any, i: number) => {
                      const correctIdx = normCorrect(q.correct_option ?? q.correctOption)
                      // Only show options that have actual content (not empty string)
                      const allOpts = [q.option_a, q.option_b, q.option_c, q.option_d]
                      const opts = allOpts.filter(o => typeof o === 'string' && o.trim() !== '')
                      const optCount = opts.length || 2
                      const isEditing = editingQId === (q.id || String(i))

                      return (
                        <div key={q.id || i} className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                          {/* Question header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-xs font-black text-slate-500">Q{i+1}</span>
                            <div className="flex gap-1.5">
                              {!isEditing && (
                                <button
                                  onClick={() => {
                                    setEditingQId(q.id || String(i))
                                    const qOptCount = [q.option_a, q.option_b, q.option_c, q.option_d]
                                      .filter(o => typeof o === 'string' && o.trim() !== '').length || 2
                                    setEditQForm({
                                      question: q.question_text || q.question || '',
                                      optionA: q.option_a || '',
                                      optionB: q.option_b || '',
                                      optionC: q.option_c || '',
                                      optionD: q.option_d || '',
                                      correctOption: correctIdx,
                                      explanation: q.explanation || '',
                                      optionCount: qOptCount,
                                    })
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  <Edit size={11}/> Edit
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm('Delete this question?')) return
                                  try {
                                    await api.quizzes.deleteQuestion(q.id)
                                    setExistingQuestions(prev => prev.filter((_,idx) => idx !== i))
                                    showToast('Question deleted')
                                  } catch (e: any) { showToast(e.message || 'Failed', 'error') }
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                              >
                                <Trash2 size={11}/> Delete
                              </button>
                            </div>
                          </div>

                          <div className="p-4">
                            {isEditing ? (
                              /* ── Edit mode ── */
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Question *</label>
                                  <textarea
                                    value={editQForm.question}
                                    onChange={e => setEditQForm({...editQForm, question: e.target.value})}
                                    className="input resize-none h-16 w-full" autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Options — click letter to mark correct</label>
                                  <div className="space-y-2">
                                    {/* Option count selector */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[10px] text-slate-500 font-medium">Options:</span>
                                    {[2,3,4].map(n => (
                                      <button key={n} onClick={() => {
                                        const keys = ['optionA','optionB','optionC','optionD']
                                        const update: any = { ...editQForm, optionCount: n }
                                        // Clear options beyond new count
                                        keys.slice(n).forEach(k => { update[k] = '' })
                                        // Cap correctOption within new range
                                        if (update.correctOption >= n) update.correctOption = 0
                                        setEditQForm(update)
                                      }}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors
                                          ${(editQForm.optionCount||4)===n?'bg-brand-500 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {n}
                                      </button>
                                    ))}
                                  </div>
                                  {['A','B','C','D'].slice(0, editQForm.optionCount || 4).map((lbl, oi) => {
                                      const key = `option${lbl}` as 'optionA'|'optionB'|'optionC'|'optionD'
                                      const isCorrect = editQForm.correctOption === oi
                                      return (
                                        <div key={oi} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors
                                          ${isCorrect ? 'border-green-400 bg-green-50' : 'border-transparent bg-slate-50'}`}>
                                          <button
                                            onClick={() => setEditQForm({...editQForm, correctOption: oi})}
                                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors
                                              ${isCorrect ? 'bg-green-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-green-400'}`}
                                          >{lbl}</button>
                                          <input
                                            value={editQForm[key]}
                                            onChange={e => setEditQForm({...editQForm, [key]: e.target.value})}
                                            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                                            placeholder={`Option ${lbl}…`}
                                          />
                                          {isCorrect && <span className="text-[10px] font-bold text-green-600 shrink-0">✓ Correct</span>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Hint / Explanation</label>
                                  <input
                                    value={editQForm.explanation}
                                    onChange={e => setEditQForm({...editQForm, explanation: e.target.value})}
                                    className="input w-full" placeholder="Why is this the correct answer?"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={async () => {
                                      if (!editQForm.question.trim()) { showToast('Question text required', 'error'); return }
                                      setSavingQ2(true)
                                      try {
                                        const letters = ['a','b','c','d']
                                        await api.quizzes.updateQuestion(q.id, {
                                          questionText:  editQForm.question.trim(),
                                          optionA:       editQForm.optionA.trim(),
                                          optionB:       editQForm.optionB.trim(),
                                          optionC:       (editQForm.optionCount || 4) >= 3 ? editQForm.optionC.trim() : '',
                                          optionD:       (editQForm.optionCount || 4) >= 4 ? editQForm.optionD.trim() : '',
                                          correctOption: letters[editQForm.correctOption] || 'a',
                                          explanation:   editQForm.explanation.trim() || null,
                                        })
                                        // Update local state so list reflects change immediately
                                        setExistingQuestions(prev => prev.map((eq, idx) => idx !== i ? eq : {
                                          ...eq,
                                          question_text:  editQForm.question.trim(),
                                          option_a: editQForm.optionA, option_b: editQForm.optionB,
                                          option_c: editQForm.optionC, option_d: editQForm.optionD,
                                          correct_option: letters[editQForm.correctOption],
                                          explanation: editQForm.explanation,
                                        }))
                                        setEditingQId(null)
                                        showToast('Question updated ✅')
                                      } catch (e: any) { showToast(e.message || 'Failed', 'error') }
                                      finally { setSavingQ2(false) }
                                    }}
                                    disabled={savingQ2}
                                    className="btn-primary text-sm"
                                  >
                                    {savingQ2 ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : <><CheckCircle2 size={13}/> Save Changes</>}
                                  </button>
                                  <button onClick={() => setEditingQId(null)} className="btn-secondary text-sm">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              /* ── Read mode ── */
                              <>
                                {q.question_image_url && <img src={q.question_image_url} alt="" className="max-h-20 rounded-xl mb-2 object-contain"/>}
                                <p className="text-sm font-semibold text-slate-800 mb-2">{q.question_text || q.question}</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {opts.map((opt: string, oi: number) => (
                                    <div key={oi} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs
                                      ${oi === correctIdx
                                        ? 'bg-green-100 text-green-800 font-semibold border border-green-200'
                                        : 'bg-white text-slate-600 border border-slate-200'}`}>
                                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
                                        ${oi === correctIdx ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {OPTION_LABELS[oi]}
                                      </span>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                                {(q.explanation || q.hint) && (
                                  <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                                    💡 {q.explanation || q.hint}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
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