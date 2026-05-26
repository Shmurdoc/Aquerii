import { useState } from 'react'
import toast from 'react-hot-toast'

const DEFAULT_PREFS = [
  { key: 'mention', label: 'Mentions', desc: 'When someone mentions you' },
  { key: 'comment', label: 'Comments', desc: 'Replies to your items or comments' },
  { key: 'assignment', label: 'Assignments', desc: 'You are assigned to an item' },
  { key: 'due_date', label: 'Due Dates', desc: 'Upcoming or overdue items' },
  { key: 'invite', label: 'Invites', desc: 'Workspace membership invites' },
  { key: 'billing', label: 'Billing', desc: 'Payment and subscription updates' },
] as const

type PrefState = Record<string, boolean>

const STORAGE_KEY = 'aquerii-notification-prefs'

function loadPrefs(): PrefState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<PrefState>(() => {
    const saved = loadPrefs()
    return Object.fromEntries(DEFAULT_PREFS.map(p => [p.key, saved[p.key] ?? true]))
  })
  const [saving, setSaving] = useState(false)

  const toggle = (key: string) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const save = () => {
    setSaving(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    setTimeout(() => { setSaving(false); toast.success('Preferences saved') }, 300)
  }

  return (
    <div className="space-y-6">
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Notification Preferences</h3>
        <p className="text-sm text-gray-400 mb-4">Choose which notifications you receive.</p>

        <div className="space-y-3">
          {DEFAULT_PREFS.map(p => (
            <label key={p.key} className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-white text-sm font-medium">{p.label}</div>
                <div className="text-gray-400 text-xs">{p.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={prefs[p.key] ?? true}
                onChange={() => toggle(p.key)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
            </label>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </section>
    </div>
  )
}
