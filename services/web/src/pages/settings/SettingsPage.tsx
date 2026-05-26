import { useState } from 'react'
import ProfileTab from './ProfileTab'
import TeamTab from './TeamTab'
import BillingTab from './BillingTab'
import SecurityTab from './SecurityTab'
import NotificationsTab from './NotificationsTab'

const TABS = [
  { key: 'profile',      label: 'Profile' },
  { key: 'team',         label: 'Team' },
  { key: 'billing',      label: 'Billing' },
  { key: 'security',     label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
] as const

export default function SettingsPage() {
  const [active, setActive] = useState('profile')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Settings</h1>

      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              active === t.key
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'profile'      && <ProfileTab />}
      {active === 'team'         && <TeamTab />}
      {active === 'billing'      && <BillingTab />}
      {active === 'security'     && <SecurityTab />}
      {active === 'notifications' && <NotificationsTab />}
    </div>
  )
}
