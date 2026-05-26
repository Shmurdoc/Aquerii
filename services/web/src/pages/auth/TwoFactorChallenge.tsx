import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function TwoFactorChallenge() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = useRecovery
        ? { recovery_code: recoveryCode }
        : { two_factor_code: code }
      const res = await api.post('/two-factor-challenge', payload)
      const { token, user, workspace } = res.data.data
      setAuth(token, user, workspace)
      navigate('/boards')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-1">Two-Factor Authentication</h2>
        <p className="text-sm text-gray-400 mb-6">
          {useRecovery
            ? 'Enter one of your recovery codes.'
            : 'Enter the code from your authenticator app.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {useRecovery ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Recovery Code</label>
              <input
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="XXXX-XXXX"
                autoComplete="off"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-600"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Authentication Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white text-center font-mono text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (useRecovery ? recoveryCode.length < 1 : code.length !== 6)
            }
            className="w-full text-xs px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying…' : 'Authenticate'}
          </button>
        </form>

        <p className="text-center mt-4">
          <button
            type="button"
            onClick={() => { setUseRecovery(!useRecovery); setCode(''); setRecoveryCode('') }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code'}
          </button>
        </p>
      </div>
    </div>
  )
}
