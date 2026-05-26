import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function TwoFactorSetup() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [qrSvg, setQrSvg] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    async function fetchQr() {
      setLoading(true)
      try {
        const res = await api.get('/user/two-factor-qr-code')
        setQrSvg(res.data?.data?.svg ?? res.data?.svg ?? '')
      } catch {
        toast.error('Failed to load QR code')
      } finally {
        setLoading(false)
      }
    }
    fetchQr()
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setVerifying(true)
    try {
      await api.post('/user/confirmed-two-factor-authentication', { code })
      const codesRes = await api.get('/user/two-factor-recovery-codes')
      setRecoveryCodes(codesRes.data?.data ?? codesRes.data ?? [])
      toast.success('Two-factor authentication enabled')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Invalid code. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (recoveryCodes.length > 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Recovery Codes</h2>
          <p className="text-sm text-gray-400 mb-4">
            Store these recovery codes in a safe place. Each code can be used once if you lose access to your authenticator app.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 mb-6 font-mono text-sm text-gray-300 space-y-1">
            {recoveryCodes.map((rc, i) => (
              <div key={i} className="tracking-wider">{rc}</div>
            ))}
          </div>
          <button
            onClick={() => navigate('/settings/profile')}
            className="w-full text-xs px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Done — Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-1">Set Up Two-Factor Authentication</h2>
        <p className="text-sm text-gray-400 mb-6">
          Scan the QR code below with your authenticator app (e.g. Google Authenticator, Authy).
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-48 mb-4">
            <svg className="animate-spin w-6 h-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : qrSvg ? (
          <div className="flex items-center justify-center mb-6 p-4 bg-white rounded-xl">
            <img
              src={`data:image/svg+xml,${encodeURIComponent(qrSvg)}`}
              alt="QR Code"
              className="max-w-full h-auto"
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center mb-6">QR code unavailable. Try refreshing.</p>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Authenticator Code</label>
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

          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            className="w-full text-xs px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify & Activate'}
          </button>
        </form>

        <p className="text-center mt-4">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  )
}
