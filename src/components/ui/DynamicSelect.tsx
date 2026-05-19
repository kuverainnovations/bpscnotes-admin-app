'use client'
import { useState, useEffect } from 'react'
import { Plus, Check, X, Loader2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

// ─────────────────────────────────────────────────────────────
// Static fallbacks — used while API loads or on failure
// ─────────────────────────────────────────────────────────────
const FALLBACKS: Record<string, string[]> = {
  'subjects': [
    'Polity','History','Geography','Economy','Bihar GK',
    'Science & Tech','General Studies','Environment','Maths','English',
  ],
  'affair-categories': [
    'General','Economy','Polity','Science & Tech','Environment',
    'International','Bihar','Sports','Defence','Awards','Technology',
  ],
  'exam-categories': [
    'BPSC','Bihar Govt','Central Govt','State PSC','Banking','SSC','Railways','Police',
  ],
  'job-categories': [
    'BPSC','Bihar Govt','Central Govt','Private','Part-time','Teaching','Banking','Police',
  ],
  'quiz-types': [
    'daily','topic','mock','previous_year',
  ],
}

// ─────────────────────────────────────────────────────────────
// Supported types
// ─────────────────────────────────────────────────────────────
type SelectType =
  | 'subjects'
  | 'affair-categories'
  | 'exam-categories'
  | 'job-categories'
  | 'quiz-types'

interface Props {
  type:         SelectType
  value:        string
  onChange:     (value: string) => void
  placeholder?: string
  className?:   string
  required?:    boolean
}

export default function DynamicSelect({
  type,
  value,
  onChange,
  placeholder = 'Select...',
  className   = '',
  required    = false,
}: Props) {
  const fallback = FALLBACKS[type] ?? []

  const [items,   setItems]   = useState<string[]>(fallback)
  const [loading, setLoading] = useState(true)
  const [apiOk,   setApiOk]   = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // ── Load items from API ──────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      let names: string[] = []

      switch (type) {
        case 'subjects': {
          const res = await api.subjects.list()
          names = (res.data?.subjects || []).map((s: any) => s.name)
          break
        }
        case 'affair-categories': {
          const res = await api.affairCategories.list()
          names = (res.data?.categories || []).map((c: any) => c.name)
          break
        }
        case 'exam-categories':
        case 'job-categories': {
          // No dedicated API — use local storage to persist admin additions
          const stored = localStorage.getItem(`bpsc_admin_${type}`)
          if (stored) {
            const parsed = JSON.parse(stored) as string[]
            names = [...new Set([...parsed, ...fallback])]
          } else {
            names = fallback
          }
          break
        }
        case 'quiz-types': {
          // Static — no API needed
          names = fallback
          break
        }
      }

      const merged = Array.from(new Set([...names, ...fallback]))
      setItems(merged.length > 0 ? merged : fallback)
      setApiOk(true)
    } catch {
      setItems(fallback)
      setApiOk(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [type])

  // ── Add new item ─────────────────────────────────────────────
  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setSaveErr('')
    try {
      switch (type) {
        case 'subjects': {
          if (apiOk) { await api.subjects.create({ name }); await load() }
          else { setItems(prev => Array.from(new Set([...prev, name]))) }
          break
        }
        case 'affair-categories': {
          if (apiOk) { await api.affairCategories.create({ name }); await load() }
          else { setItems(prev => Array.from(new Set([...prev, name]))) }
          break
        }
        case 'exam-categories':
        case 'job-categories': {
          // Persist to localStorage
          const newList = Array.from(new Set([...items, name]))
          localStorage.setItem(`bpsc_admin_${type}`, JSON.stringify(newList))
          setItems(newList)
          break
        }
        default: {
          setItems(prev => Array.from(new Set([...prev, name])))
          break
        }
      }
      onChange(name)
      setAdding(false)
      setNewName('')
    } catch (e: any) {
      // Still add locally so the form can proceed
      setItems(prev => Array.from(new Set([...prev, name])))
      onChange(name)
      setAdding(false)
      setNewName('')
    } finally {
      setSaving(false)
    }
  }

  const addLabel = type === 'subjects'
    ? 'subject'
    : type === 'affair-categories'
    ? 'category'
    : type === 'exam-categories'
    ? 'exam category'
    : type === 'job-categories'
    ? 'job category'
    : 'option'

  return (
    <div className="space-y-1">
      {/* API warning — subtle, non-blocking */}
      {!loading && !apiOk && type !== 'exam-categories' && type !== 'job-categories' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={11} className="flex-shrink-0" />
          <span>Using offline list. Register SubjectsModule in app.module.ts to enable persistence.</span>
        </div>
      )}

      <div className="flex gap-1.5">
        {loading ? (
          <div className="input flex-1 flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={13} className="animate-spin" /> Loading…
          </div>
        ) : (
          <select
            value={value}
            required={required}
            onChange={e => onChange(e.target.value)}
            className={`input flex-1 ${className}`}
          >
            <option value="">{placeholder}</option>
            {items.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
            {/* Show current value even if not in list */}
            {value && !items.includes(value) && (
              <option value={value}>{value}</option>
            )}
          </select>
        )}

        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setSaveErr('') }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
            title={`Add new ${addLabel}`}
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="flex gap-1.5 items-center bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder={`New ${addLabel} name…`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(''); setSaveErr('') }}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
    </div>
  )
}
