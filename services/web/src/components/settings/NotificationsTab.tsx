import { useEffect, useState } from 'react'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useSettings'
import { NotificationPreferences } from '@/lib/settings'
import { FileText, Users, Calendar, DollarSign } from 'lucide-react'

interface ToggleGroup {
  label: string
  icon: React.ReactNode
  keys: { key: string; label: string }[]
}

const TOGGLE_GROUPS: ToggleGroup[] = [
  {
    label: 'Invoices',
    icon: <FileText size={14} />,
    keys: [
      { key: 'email_invoice_sent', label: 'Invoice sent' },
      { key: 'email_invoice_received', label: 'Invoice received' },
      { key: 'email_invoice_paid', label: 'Invoice paid' },
    ],
  },
  {
    label: 'Leave Requests',
    icon: <Calendar size={14} />,
    keys: [
      { key: 'email_leave_submitted', label: 'Leave submitted' },
      { key: 'email_leave_approved', label: 'Leave approved' },
      { key: 'email_leave_declined', label: 'Leave declined' },
    ],
  },
  {
    label: 'Expenses',
    icon: <DollarSign size={14} />,
    keys: [
      { key: 'email_expense_approved', label: 'Expense approved' },
      { key: 'email_expense_declined', label: 'Expense declined' },
    ],
  },
  {
    label: 'Meetings',
    icon: <Calendar size={14} />,
    keys: [
      { key: 'email_meeting_invitation', label: 'Meeting invitations' },
    ],
  },
  {
    label: 'Workspace',
    icon: <Users size={14} />,
    keys: [
      { key: 'email_member_joined', label: 'Member joined workspace' },
      { key: 'email_member_left', label: 'Member left workspace' },
    ],
  },
]

export default function NotificationsTab() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()

  const [values, setValues] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (prefs) setValues(prefs as unknown as Record<string, boolean>)
  }, [prefs])

  function toggle(key: string) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    updatePrefs.mutate(values as unknown as NotificationPreferences)
  }

  const hasChanges = prefs && Object.keys(values).some((k) => values[k] !== (prefs as unknown as Record<string, boolean>)[k])

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Notifications</h2>
      <p className="text-xs text-gray-500 mb-6">Choose which updates you receive via email.</p>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading preferences…</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 mb-6">
            {TOGGLE_GROUPS.map((group) => (
              <div key={group.label} className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400">{group.icon}</span>
                  <span className="text-sm font-medium text-gray-200">{group.label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.keys.map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                      <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{item.label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={values[item.key] ?? false}
                        onClick={() => toggle(item.key)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${values[item.key] ? 'bg-indigo-600' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${values[item.key] ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={updatePrefs.isPending || !hasChanges}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {updatePrefs.isPending ? 'Saving…' : 'Save Preferences'}
          </button>
        </>
      )}
    </div>
  )
}
