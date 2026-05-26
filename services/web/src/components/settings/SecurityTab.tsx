import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { useSessions, useRevokeSession, useAuditLogs, useChangePassword } from '@/hooks/useSettings'
import { settingsApi } from '@/lib/settings'
import { Shield, Monitor, Smartphone, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

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

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString()
  }

  function deviceIcon(device: string) {
    const d = device.toLowerCase()
    if (d.includes('mobile') || d.includes('phone') || d.includes('iphone') || d.includes('android')) return <Smartphone size={14} />
    return <Monitor size={14} />
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Security</h2>
      <p className="text-xs text-gray-500 mb-6">Manage your password, 2FA, sessions, and audit log.</p>

      {/* ─── Password ─────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-200 mb-1">Change Password</h3>
        <p className="text-xs text-gray-500 mb-4">Update your account password.</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">New Password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
          <div className="pt-1">
            <button type="submit" disabled={changePassword.isPending || !currentPw || !newPw || !confirmPw}
              className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {changePassword.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 2FA ──────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={18} className={twoFactorEnabled ? 'text-emerald-400' : 'text-gray-500'} />
          <div>
            <p className="text-sm text-gray-200">
              Two-Factor Authentication{' '}
              <span className={twoFactorEnabled ? 'text-emerald-400' : 'text-gray-500'}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {twoFactorEnabled
                ? 'Your account is protected by an authenticator app.'
                : 'Add an extra layer of security with an authenticator app.'}
            </p>
          </div>
        </div>
        {twoFactorEnabled ? (
          <button onClick={handleDisable2FA} disabled={disableLoading}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors">
            {disableLoading ? 'Disabling…' : 'Disable'}
          </button>
        ) : (
          <button onClick={() => navigate('/auth/2fa-setup')}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            Enable
          </button>
        )}
      </div>

      {/* ─── Active Sessions ──────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-200 mb-1">Active Sessions</h3>
        <p className="text-xs text-gray-500 mb-3">Devices and browsers currently logged into your account.</p>
        {sessionsLoading ? (
          <p className="text-gray-500 text-xs">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500 text-xs">No active sessions found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-3 bg-gray-800/30 border border-gray-800 rounded-lg px-4 py-3">
                <div className="text-gray-400 flex-shrink-0">
                  {deviceIcon(session.device)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">
                    {session.device}
                    {session.is_current && <span className="text-xs text-indigo-400 ml-2">(current)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    IP: {session.ip_address} &middot; Last active: {formatDate(session.last_active_at)}
                  </p>
                </div>
                {!session.is_current && (
                  <button onClick={() => revokeSession.mutate(session.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Audit Log ────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-200 mb-1">Audit Log</h3>
        <p className="text-xs text-gray-500 mb-3">Recent security-relevant actions in your workspace.</p>
        {auditLoading ? (
          <p className="text-gray-500 text-xs">Loading audit log…</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-gray-500 text-xs">No audit log entries yet.</p>
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
                {auditLogs.map((entry) => (
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
    </div>
  )
}
