import { useState, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useSessions, useRevokeSession, useAuditLogs, useChangePassword } from '@/hooks/useSettings'
import { settingsApi } from '@/lib/settings'
import { Shield, Monitor, Smartphone, Trash2, Search, Clock, Laptop, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import toast from 'react-hot-toast'

function getPasswordStrength(pw: string): { label: string; color: string; score: number } {
  if (!pw) return { label: '', color: '', score: 0 }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw)) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 2) return { label: 'Weak', color: 'text-red-400', score }
  if (score <= 4) return { label: 'Medium', color: 'text-amber-400', score }
  return { label: 'Strong', color: 'text-emerald-400', score }
}

function parseDevice(device: string): { browser: string; os: string } {
  const d = device.toLowerCase()
  let browser = device
  let os = ''
  if (d.includes('chrome')) browser = 'Chrome'
  else if (d.includes('firefox')) browser = 'Firefox'
  else if (d.includes('safari')) browser = 'Safari'
  else if (d.includes('edge')) browser = 'Edge'
  else if (d.includes('opera')) browser = 'Opera'
  if (d.includes('windows')) os = 'Windows'
  else if (d.includes('mac') || d.includes('darwin')) os = 'macOS'
  else if (d.includes('linux')) os = 'Linux'
  else if (d.includes('iphone') || d.includes('ipad')) os = 'iOS'
  else if (d.includes('android')) os = 'Android'
  return { browser, os }
}

function deviceIcon(device: string) {
  const d = device.toLowerCase()
  if (d.includes('mobile') || d.includes('phone') || d.includes('iphone') || d.includes('android')) return <Smartphone size={14} />
  return <Monitor size={14} />
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

export default function SecurityTab() {
  const user = useAuthStore((s) => s.user)!
  const navigate = useNavigate()

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const revokeSession = useRevokeSession()
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs()
  const changePassword = useChangePassword()

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.mfa_enabled)
  const [disableLoading, setDisableLoading] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)

  const [auditSearch, setAuditSearch] = useState('')

  const passwordStrength = useMemo(() => getPasswordStrength(newPw), [newPw])

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs
    const q = auditSearch.toLowerCase()
    return auditLogs.filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.user_name.toLowerCase().includes(q) ||
      e.ip_address.toLowerCase().includes(q)
    )
  }, [auditLogs, auditSearch])

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) {
      toast.error('New passwords do not match')
      return
    }
    if (newPw.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    changePassword.mutateAsync({
      current_password: currentPw,
      new_password: newPw,
      new_password_confirmation: confirmPw,
    }).then(() => {
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    })
  }

  async function handleDisable2FA() {
    if (!confirm('Disable two-factor authentication? Your account will be less secure.')) return
    setDisableLoading(true)
    try {
      await settingsApi.disableTwoFactor()
      setTwoFactorEnabled(false)
      toast.success('Two-factor authentication disabled')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to disable 2FA')
    } finally {
      setDisableLoading(false)
    }
  }

  async function handleRevokeSession() {
    if (!revokeTarget) return
    await revokeSession.mutateAsync(revokeTarget)
    setRevokeTarget(null)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Security</h2>
      <p className="text-xs text-gray-500 mb-6">Manage your password, 2FA, sessions, and audit log.</p>

      <Tabs defaultValue="password">
        <TabList>
          <Tab value="password">Password</Tab>
          <Tab value="2fa">Two-Factor Auth</Tab>
          <Tab value="sessions">Sessions</Tab>
          <Tab value="audit">Audit Log</Tab>
        </TabList>

        <TabPanel value="password" className="mt-6">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-1">Change Password</h3>
            <p className="text-xs text-gray-500 mb-4">Update your account password.</p>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <Input
                label="Current Password"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                size="md"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="New Password"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  size="md"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  size="md"
                />
              </div>
              {newPw && (
                <p className={`text-xs ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.label}
                </p>
              )}
              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
              <div className="pt-1">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={changePassword.isPending || !currentPw || !newPw || !confirmPw}
                  loading={changePassword.isPending}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </TabPanel>

        <TabPanel value="2fa" className="mt-6">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={18} className={twoFactorEnabled ? 'text-emerald-400' : 'text-gray-500'} />
              <div>
                <p className="text-sm text-gray-200 flex items-center gap-2">
                  Two-Factor Authentication
                  <Badge variant={twoFactorEnabled ? 'success' : 'default'} size="sm" dot>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {twoFactorEnabled
                    ? 'Your account is protected by an authenticator app.'
                    : 'Add an extra layer of security with an authenticator app.'}
                </p>
              </div>
            </div>
            {twoFactorEnabled ? (
              <Button variant="danger" size="sm" disabled={disableLoading} loading={disableLoading} onClick={handleDisable2FA}>
                Disable
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate('/auth/2fa-setup')}>
                Enable
              </Button>
            )}
          </div>
        </TabPanel>

        <TabPanel value="sessions" className="mt-6">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-1">Active Sessions</h3>
            <p className="text-xs text-gray-500 mb-3">Devices and browsers currently logged into your account.</p>
            {sessionsLoading ? (
              <p className="text-gray-500 text-xs">Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p className="text-gray-500 text-xs">No active sessions found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map((session) => {
                  const { browser, os } = parseDevice(session.device)
                  return (
                    <div key={session.id} className="flex items-center gap-3 bg-gray-800/30 border border-gray-800 rounded-lg px-4 py-3">
                      <div className="text-gray-400 flex-shrink-0">
                        {deviceIcon(session.device)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">
                          {browser}
                          {os && <span className="text-gray-500 font-normal"> on {os}</span>}
                          {session.is_current && <Badge variant="primary" size="sm" className="ml-2">Current</Badge>}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Globe size={10} /> {session.ip_address}
                          <Clock size={10} className="ml-2" /> Last active: {formatDate(session.last_active_at)}
                        </p>
                      </div>
                      {!session.is_current && (
                        <button onClick={() => setRevokeTarget(session.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="audit" className="mt-6">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-1">Audit Log</h3>
            <p className="text-xs text-gray-500 mb-3">Recent security-relevant actions in your workspace.</p>
            <div className="mb-3">
              <Input
                placeholder="Search audit log..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                icon={Search}
                size="sm"
                clearable
                onClear={() => setAuditSearch('')}
              />
            </div>
            {auditLoading ? (
              <p className="text-gray-500 text-xs">Loading audit log…</p>
            ) : filteredAuditLogs.length === 0 ? (
              <p className="text-gray-500 text-xs">No audit log entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left font-medium py-2 pr-4">User</th>
                      <th className="text-left font-medium py-2 pr-4">Action</th>
                      <th className="text-left font-medium py-2 pr-4">IP</th>
                      <th className="text-left font-medium py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="py-2 pr-4 text-gray-300">{entry.user_name}</td>
                        <td className="py-2 pr-4 text-gray-400">{entry.action}</td>
                        <td className="py-2 pr-4 text-gray-500 font-mono">{entry.ip_address}</td>
                        <td className="py-2 text-gray-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabPanel>
      </Tabs>

      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Session"
        description="This will sign out the device associated with this session. The user will need to log in again."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRevokeSession} loading={revokeSession.isPending}>
              Revoke
            </Button>
          </>
        }
      />
    </div>
  )
}
