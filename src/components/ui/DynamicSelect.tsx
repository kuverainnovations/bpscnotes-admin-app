'use client'
import { useState, useEffect } from 'react'
import { Plus, Check, X, Loader2, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

// Static fallback — used when /admin/subjects API is unavailable
// (e.g. SubjectsModule not registered in app.module.ts yet)
const FALLBACK_SUBJECTS = [
  'Polity','History','Geography','Economy','Bihar GK',
  'Science & Tech','General Studies','Environment','Maths','English',
]
const FALLBACK_CATEGORIES = [
  'General','Economy','Polity','Science & Tech','Environment',
  'International','Bihar','Sports','Defence','Awards',
]

interface Props {
  type:         'subjects' | 'affair-categories'
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
  className = '',
  required = false,
}: Props) {
  const fallback   = type === 'subjects' ? FALLBACK_SUBJECTS : FALLBACK_CATEGORIES
  const [items,    setItems]   = useState<string[]>(fallback)   // start with fallback
  const [loading,  setLoading] = useState(true)
  const [apiOk,    setApiOk]   = useState(true)                 // track if API works
  const [adding,   setAdding]  = useState(false)
  const [newName,  setNewName] = useState('')
  const [saving,   setSaving]  = useState(false)
  const [saveErr,  setSaveErr] = useState('')

  // Load from API — fall back to static list silently on failure
  const load = async () => {
    setLoading(true)
    try {
      let names: string[]
      if (type === 'subjects') {
        const res = await api.subjects.list()
        names = (res.data?.subjects || []).map((s: any) => s.name)
      } else {
        const res = await api.affairCategories.list()
        names = (res.data?.categories || []).map((c: any) => c.name)
      }
      // Merge API results with fallback so nothing disappears
      const merged = Array.from(new Set([...names, ...fallback]))
      setItems(merged.length > 0 ? merged : fallback)
      setApiOk(true)
    } catch {
      // API unavailable — keep fallback list, show subtle warning
      setItems(fallback)
      setApiOk(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [type])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    setSaveErr('')
    try {
      if (apiOk) {
        // API available — persist to DB
        if (type === 'subjects') {
          await api.subjects.create({ name })
          await load()
        } else {
          await api.affairCategories.create({ name })
          await load()
        }
      } else {
        // API unavailable — add to local list only (will persist after module is registered)
        setItems(prev => Array.from(new Set([...prev, name])))
      }
      onChange(name)
      setAdding(false)
      setNewName('')
    } catch (e: any) {
      // Still add locally so form can proceed
      setItems(prev => Array.from(new Set([...prev, name])))
      onChange(name)
      setAdding(false)
      setNewName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1">
      {/* Warning when API is down — subtle, not blocking */}
      {!loading && !apiOk && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={11} className="flex-shrink-0" />
          <span>Using offline list. Register SubjectsModule in app.module.ts to enable persistence.</span>
        </div>
      )}

      <div className="flex gap-1.5">
        {loading ? (
          <div className="input flex-1 flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={13} className="animate-spin" /> Loading subjects…
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
            {/* Show currently typed value even if not in list */}
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
            title={`Add new ${type === 'subjects' ? 'subject' : 'category'}`}
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
            placeholder={`New ${type === 'subjects' ? 'subject' : 'category'} name…`}
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
