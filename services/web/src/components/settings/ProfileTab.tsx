import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateProfile } from '@/hooks/useSettings'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '@/lib/settings'
import toast from 'react-hot-toast'

export default function ProfileTab() {
  const user = useAuthStore((s) => s.user)!
  const navigate = useNavigate()

  const [name, setName]             = useState(user.name)
  const [password, setPassword]     = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.mfa_enabled)
  const [disableLoading, setDisableLoading] = useState(false)
  const updateProfile               = useUpdateProfile()

  useEffect(() => {
    setTwoFactorEnabled(user.mfa_enabled)
  }, [user.mfa_enabled])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {}
    if (name !== user.name) payload.name = name
    if (password) {
      if (password.length < 8) return
      if (password !== confirmPw) return
      payload.password = password
      payload.password_confirmation = confirmPw
    }
    if (Object.keys(payload).length === 0) return
    await updateProfile.mutateAsync(payload)
    setPassword('')
    setConfirmPw('')
  }

  async function handleDisable() {
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

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-100 mb-1">Profile</h2>
      <p className="text-xs text-gray-500 mb-6">Update your name and password.</p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Email</label>
          <input value={user.email} disabled
            className="bg-gray-800/50 border border-gray-700 rounded px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
          <p className="text-[10px] text-gray-600">Email cannot be changed</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
        </div>

        <hr className="border-gray-800" />
        <p className="text-xs text-gray-500">Change password (leave blank to keep current)</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Confirm Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        {password && password !== confirmPw && (
          <p className="text-xs text-red-400">Passwords do not match</p>
        )}
        {password && password.length < 8 && (
          <p className="text-xs text-red-400">Password must be at least 8 characters</p>
        )}

        <div className="pt-2">
          <button type="submit" disabled={updateProfile.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Two-factor authentication */}
      <hr className="border-gray-800 my-6" />
      <h3 className="text-base font-semibold text-gray-100 mb-1">Two-Factor Authentication</h3>
      <p className="text-xs text-gray-500 mb-4">Add an extra layer of security to your account.</p>

      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-200">
            Status:{' '}
            <span className={twoFactorEnabled ? 'text-emerald-400' : 'text-gray-500'}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {twoFactorEnabled
              ? 'Your account is protected by two-factor authentication.'
              : 'Protect your account with an authenticator app.'}
          </p>
        </div>
        {twoFactorEnabled ? (
          <button
            onClick={handleDisable}
            disabled={disableLoading}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {disableLoading ? 'Disabling…' : 'Disable'}
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth/2fa-setup')}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Enable
          </button>
        )}
      </div>
    </div>
  )
}
