'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Save, RefreshCw, Database, Smartphone, Coins, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const { showToast, ToastComponent } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.settings.getAll()
      const map: Record<string, string> = {}
      ;(res.data?.settings || []).forEach((s: any) => { map[s.key] = s.value })
      setSettings(map)
    } catch (e: any) {
      showToast(e.message || 'Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const set = (key: string, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      await api.settings.update(settings)
      setSaved(true)
      showToast('Settings saved — effective immediately in mobile app ✅')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      showToast(e.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ k, label, desc }: { k: string; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        onClick={() => set(k, settings[k] === 'true' ? 'false' : 'true')}
        className={`relative w-11 h-6 rounded-full transition-colors ${settings[k] === 'true' ? 'bg-brand-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[k] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen">
      {ToastComponent}
      <Header title="App Settings" subtitle="Configure global app settings — changes are live immediately" />
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Warning if maintenance mode is on */}
        {settings.maintenance_mode === 'true' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">⚠️ Maintenance Mode is ON</p>
              <p className="text-xs text-red-600">The app is currently showing a maintenance screen to all users.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* App Controls */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">App Controls</h2>
            </div>
            <div>
              <Toggle k="maintenance_mode"    label="🔧 Maintenance Mode"    desc="Show maintenance screen to all users" />
              <Toggle k="force_update"        label="📲 Force Update"        desc="Force users to update the app" />
              <Toggle k="new_registrations"   label="📝 New Registrations"   desc="Allow new user registrations" />
              <Toggle k="study_rooms_enabled" label="👥 Group Study Rooms"   desc="Allow students to create/join study rooms" />
            </div>
          </div>

          {/* Version Settings */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Version Settings</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current App Version</label>
                <input value={settings.app_version || ''} onChange={e => set('app_version', e.target.value)} className="input" placeholder="1.0.0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Minimum Required Version</label>
                <input value={settings.min_app_version || ''} onChange={e => set('min_app_version', e.target.value)} className="input" placeholder="1.0.0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Android Play Store URL</label>
                <input value={settings.android_store_url || ''} onChange={e => set('android_store_url', e.target.value)} className="input" placeholder="https://play.google.com/store/apps/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Support Email</label>
                <input value={settings.support_email || ''} onChange={e => set('support_email', e.target.value)} className="input" placeholder="support@bpscnotes.com" />
              </div>
            </div>
          </div>

          {/* Coin Settings — moved to the unified Coins Control Center */}
          <div className="card p-5 bg-amber-50/40 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} className="text-amber-500" />
              <h2 className="section-title mb-0">Coins &amp; Rewards</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              The coin system master switch, coin↔₹ rate, spending caps, check-in
              rewards, every earning rule, and rewarded-ad payouts now all live
              together on the Coins page — one place for the whole coin economy.
            </p>
            <a href="/coins" className="btn-primary text-sm inline-flex items-center gap-1.5">
              <Coins size={13}/> Open Coins Control Center
            </a>
          </div>

          {/* All Settings — raw view */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">All Settings</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(settings).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs font-mono text-slate-600 truncate max-w-[160px]">{k}</span>
                  <span className={`badge text-[10px] shrink-0 ${
                    v === 'true'  ? 'bg-green-100 text-green-700 border-green-200' :
                    v === 'false' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className={`btn-primary text-base px-8 py-3 ${saved ? 'bg-green-500 hover:bg-green-500' : ''}`}
          >
            <Save size={16} />
            {saving ? 'Saving...' : saved ? '✓ All Settings Saved!' : 'Save All Settings'}
          </button>
        </div>

      </div>
    </div>
  )
}
