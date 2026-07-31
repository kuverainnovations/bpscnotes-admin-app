'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import api from '@/lib/api'
import { useToast } from '@/components/ui/feedback'
import { Save, RefreshCw, Database, Smartphone, Coins, AlertTriangle, Bell, Share2 } from 'lucide-react'

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
              <Toggle k="maintenance_mode"        label="🔧 Maintenance Mode"         desc="Show maintenance screen to all users" />
              <Toggle k="force_update"            label="📲 Force Update"             desc="Force users to update the app" />
              <Toggle k="new_registrations"       label="📝 New Registrations"        desc="Allow new user registrations" />
              <Toggle k="study_rooms_enabled"     label="👥 Group Study Rooms"        desc="Allow students to create/join study rooms" />
              <Toggle k="screen_capture_protection" label="🔒 Screen Capture Protection" desc="Block screenshots/recording on quiz screens" />
            </div>
          </div>

          {/* Quiz Settings */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Quiz Settings</h2>
            </div>
            <div>
              <Toggle k="quiz_shuffle_questions" label="🔀 Shuffle Questions" desc="Randomise question order for each attempt" />
              <Toggle k="quiz_shuffle_options"   label="🔀 Shuffle Options"   desc="Randomise option order for each attempt" />
            </div>
          </div>

          {/* Scheduled Notifications */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Scheduled Notifications</h2>
            </div>
            <div className="space-y-4">
              {/* Daily Quiz Unlock */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <Toggle k="notif_daily_quiz_enabled" label="📝 Daily Quiz Unlock" desc="Notify users who haven't started today's quiz" />
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-slate-500 w-28">Send at (IST hour):</label>
                  <input
                    type="number" min="0" max="23"
                    value={settings.notif_daily_quiz_hour_ist || '7'}
                    onChange={e => set('notif_daily_quiz_hour_ist', e.target.value)}
                    className="input w-20 text-sm py-1"
                  />
                  <span className="text-xs text-slate-400">:00 IST</span>
                </div>
              </div>
              {/* Streak at Risk */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <Toggle k="notif_streak_risk_enabled" label="🔥 Streak at Risk" desc="Notify users with streak &gt; 0 who haven't studied today" />
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-slate-500 w-28">Send at (IST hour):</label>
                  <input
                    type="number" min="0" max="23"
                    value={settings.notif_streak_risk_hour_ist || '20'}
                    onChange={e => set('notif_streak_risk_hour_ist', e.target.value)}
                    className="input w-20 text-sm py-1"
                  />
                  <span className="text-xs text-slate-400">:00 IST</span>
                </div>
              </div>
              {/* Daily Target Reminder */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <Toggle k="notif_target_reminder_enabled" label="🎯 Daily Target Reminder" desc="Remind users with a daily goal who haven't studied" />
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-xs text-slate-500 w-28">Send at (IST hour):</label>
                  <input
                    type="number" min="0" max="23"
                    value={settings.notif_target_reminder_hour_ist || '9'}
                    onChange={e => set('notif_target_reminder_hour_ist', e.target.value)}
                    className="input w-20 text-sm py-1"
                  />
                  <span className="text-xs text-slate-400">:00 IST</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">Note: Cron times are fixed at migration defaults. Changing the hour here updates the app_settings record but the cron itself runs at the hardcoded UTC time. Contact engineering to change cron schedule.</p>
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

          {/* Social links — rendered next to Logout in the app. Leaving one blank
              hides that icon, so an unset channel never ships a dead link. */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Share2 size={18} className="text-brand-500" />
              <h2 className="section-title mb-0">Social Links</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">Shown in the app under Settings and in the menu drawer. Leave blank to hide that icon.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instagram</label>
                <input value={settings.social_instagram || ''} onChange={e => set('social_instagram', e.target.value)} className="input" placeholder="https://instagram.com/bpscnotes" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telegram</label>
                <input value={settings.social_telegram || ''} onChange={e => set('social_telegram', e.target.value)} className="input" placeholder="https://t.me/bpscnotes" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Facebook</label>
                <input value={settings.social_facebook || ''} onChange={e => set('social_facebook', e.target.value)} className="input" placeholder="https://facebook.com/bpscnotes" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">WhatsApp</label>
                <input value={settings.social_whatsapp || ''} onChange={e => set('social_whatsapp', e.target.value)} className="input" placeholder="https://whatsapp.com/channel/… or https://wa.me/91XXXXXXXXXX" />
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
