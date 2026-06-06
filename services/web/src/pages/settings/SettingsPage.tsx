import { useState } from 'react'
import ProfileTab from './ProfileTab'
import TeamTab from './TeamTab'
import BillingTab from './BillingTab'
import SecurityTab from './SecurityTab'
import NotificationsTab from './NotificationsTab'
import BrandingTab from './BrandingTab'

const TABS = [
  { key: 'profile',      label: 'Profile' },
  { key: 'team',         label: 'Team' },
  { key: 'billing',      label: 'Billing' },
  { key: 'security',     label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'branding',     label: 'Branding' },
] as const

export default function SettingsPage() {
  const [active, setActive] = useState('profile')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage your account, team, and workspace settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-glass-border)] animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              active === t.key
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {active === 'profile' && <ProfileTab />}
        {active === 'team' && <TeamTab />}
        {active === 'billing' && <BillingTab />}
        {active === 'security' && <SecurityTab />}
        {active === 'notifications' && <NotificationsTab />}
        {active === 'branding' && <BrandingTab />}
      </div>
    </div>
  )
}
