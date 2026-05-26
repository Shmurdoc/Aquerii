import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function SecurityTab() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const mfaEnabled = user?.mfa_enabled ?? false

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaInput, setShowMfaInput] = useState(false)
  const [qrcode, setQrcode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match')
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
      return api.put('/me', { password: newPassword })
    },
    onSuccess: () => {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => {
      const msg = err?.message ?? err?.response?.data?.message ?? 'Failed to update password'
      toast.error(msg)
    },
  })

  const enableMfa = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/mfa/enable')
      return res.data.data
    },
    onSuccess: (d) => {
      setQrcode(d.qr_url ?? d.qrCode ?? '')
      setRecoveryCodes(d.recovery_codes ?? d.recoveryCodes ?? [])
      setShowMfaInput(true)
    },
    onError: () => toast.error('Failed to enable MFA'),
  })

  const verifyMfa = useMutation({
    mutationFn: async () => api.post('/auth/mfa/verify', { code: mfaCode }),
    onSuccess: () => {
      toast.success('MFA enabled successfully')
      qc.invalidateQueries({ queryKey: ['me'] })
      if (user) setUser({ ...user, mfa_enabled: true })
      setShowMfaInput(false)
      setMfaCode('')
      setQrcode('')
      setRecoveryCodes([])
    },
    onError: () => toast.error('Invalid code — please try again'),
  })

  const disableMfa = useMutation({
    mutationFn: async () => api.post('/auth/mfa/disable'),
    onSuccess: () => {
      toast.success('MFA disabled')
      qc.invalidateQueries({ queryKey: ['me'] })
      if (user) setUser({ ...user, mfa_enabled: false })
    },
    onError: () => toast.error('Failed to disable MFA'),
  })

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Change Password</h3>
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
          <button
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || !newPassword || !confirmPassword}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
          >
            {changePassword.isPending ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </section>

      {/* MFA */}
      <section className="bg-gray-900 p-4 rounded">
        <h3 className="text-lg font-medium text-white">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-400 mt-1">
          {mfaEnabled
            ? '✓ MFA is enabled on your account'
            : 'Add an extra layer of security to your account'}
        </p>

        {!mfaEnabled && !showMfaInput && (
          <button
            onClick={() => enableMfa.mutate()}
            disabled={enableMfa.isPending}
            className="mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
          >
            {enableMfa.isPending ? 'Generating…' : 'Enable MFA'}
          </button>
        )}

        {showMfaInput && (
          <div className="mt-3 space-y-4">
            {qrcode && (
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>
                <img src={qrcode} alt="MFA QR Code" className="w-40 h-40 bg-white p-2 rounded" />
              </div>
            )}
            {recoveryCodes.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-1 font-medium">
                  Save these recovery codes somewhere safe. You won't see them again:
                </p>
                <pre className="bg-gray-800 p-3 rounded text-xs text-gray-300 select-all">
                  {recoveryCodes.join('\n')}
                </pre>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400 mb-2">Enter the 6-digit code from your app to confirm:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white tracking-widest"
                />
                <button
                  onClick={() => verifyMfa.mutate()}
                  disabled={verifyMfa.isPending || mfaCode.length < 6}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
                >
                  {verifyMfa.isPending ? 'Verifying…' : 'Verify & Enable'}
                </button>
                <button
                  onClick={() => { setShowMfaInput(false); setMfaCode(''); setQrcode('') }}
                  className="text-gray-400 text-sm px-3 py-2 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {mfaEnabled && (
          <button
            onClick={() => { if (confirm('Are you sure you want to disable MFA? Your account will be less secure.')) disableMfa.mutate() }}
            disabled={disableMfa.isPending}
            className="mt-3 text-red-400 text-sm hover:text-red-300 disabled:opacity-50"
          >
            {disableMfa.isPending ? 'Disabling…' : 'Disable MFA'}
          </button>
        )}
      </section>
    </div>
  )
}
