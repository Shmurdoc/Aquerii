import { useEffect, useState } from 'react'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useSettings'
import { NotificationPreferences } from '@/lib/settings'
import { FileText, Users, Calendar, DollarSign, Bell, BellOff } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type DeliveryMethod = 'email' | 'in_app' | 'both'

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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email')
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')

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
      <p className="text-xs text-gray-500 mb-6">Choose which updates you receive and how.</p>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading preferences…</p>
      ) : (
        <>
          <Card variant="glass" padding="md" className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Delivery Method</span>
              </div>
            </div>
            <div className="mt-3">
              <Select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                size="sm"
              >
                <option value="email">Email</option>
                <option value="in_app">In-app</option>
                <option value="both">Email &amp; In-app</option>
              </Select>
            </div>
          </Card>

          <Card variant="glass" padding="md" className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {quietHoursEnabled ? <BellOff size={14} className="text-gray-400" /> : <Bell size={14} className="text-gray-400" />}
                <span className="text-sm font-medium text-gray-200">Quiet Hours</span>
              </div>
              <Toggle
                checked={quietHoursEnabled}
                onChange={setQuietHoursEnabled}
                size="sm"
              />
            </div>
            {quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  size="sm"
                />
                <Input
                  label="End Time"
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  size="sm"
                />
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4 mb-6">
            {TOGGLE_GROUPS.map((group) => (
              <Card key={group.label} variant="glass" padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400">{group.icon}</span>
                  <span className="text-sm font-medium text-gray-200">{group.label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.keys.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{item.label}</span>
                      <Toggle
                        checked={values[item.key] ?? false}
                        onChange={() => toggle(item.key)}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Button
            size="sm"
            variant="primary"
            disabled={updatePrefs.isPending || !hasChanges}
            loading={updatePrefs.isPending}
            onClick={handleSave}
          >
            Save Preferences
          </Button>
        </>
      )}
    </div>
  )
}
