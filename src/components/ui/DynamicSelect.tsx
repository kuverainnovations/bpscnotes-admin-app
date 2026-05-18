'use client'
import { useState, useEffect } from 'react'
import { Plus, Check, X, Loader2 } from 'lucide-react'
import api from '@/lib/api'

// ════════════════════════════════════════════════════════════
// FILE: admin/src/components/ui/DynamicSelect.tsx
//
// A <select> dropdown that loads items from API and lets
// the admin add new items inline with the + Add button.
//
// Usage:
//   <DynamicSelect type="subjects" value={form.subject}
//     onChange={v => setForm({...form, subject: v})} />
// ════════════════════════════════════════════════════════════

interface Props {
  type:         'subjects' | 'affair-categories'
  value:        string
  onChange:     (value: string) => void
  placeholder?: string
  className?:   string
  required?:    boolean
}

export default function DynamicSelect({
  type, value, onChange, placeholder = 'Select...', className = '', required
}: Props) {
  const [items,   setItems]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      if (type === 'subjects') {
        const res = await api.subjects.list()
        setItems((res.data?.subjects || []).map((s: any) => s.name))
      } else {
        const res = await api.affairCategories.list()
        setItems((res.data?.categories || []).map((c: any) => c.name))
      }
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [type])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      if (type === 'subjects') {
        await api.subjects.create({ name })
      } else {
        await api.affairCategories.create({ name })
      }
      await load()
      onChange(name)
      setAdding(false)
      setNewName('')
    } catch { setError('Failed to add') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`input flex-1 ${className}`}
          required={required}
          disabled={loading}
        >
          <option value="">{loading ? 'Loading…' : placeholder}</option>
          {items.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setError('') }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
            title={`Add new ${type === 'subjects' ? 'subject' : 'category'}`}
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-1.5 items-center bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder={`New ${type === 'subjects' ? 'subject' : 'category'}…`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={handleAdd} disabled={saving || !newName.trim()}
            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewName(''); setError('') }}
            className="p-1 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
