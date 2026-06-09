import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Button, Input, Card, CardHeader, CardBody, Badge } from '@/components/ui'

interface SetupData {
  secret: string
  qr_code: string
  recovery_codes: string[]
}

export default function TwoFactorSetup() {
  const navigate = useNavigate()
  const [data, setData] = useState<SetupData | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const res = await api.post('/auth/2fa/setup')
        setData(res.data.data)
      } catch {
        toast.error('Failed to initialize 2FA setup.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleVerify = useCallback(async () => {
    if (token.length !== 6) return
    setVerifying(true)
    try {
      await api.post('/auth/2fa/verify', { token })
      setSetupComplete(true)
      toast.success('Two-factor authentication enabled.')
    } catch {
      toast.error('Invalid code. Try again.')
    } finally {
      setVerifying(false)
    }
  }, [token])

  const handleCopyCodes = useCallback(async () => {
    if (!data) return
    await navigator.clipboard.writeText(data.recovery_codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [data])

  if (loading) {
    return (
      <Card variant="glass" className="max-w-md mx-auto text-center">
        <CardBody>
          <p className="text-gray-400">Loading setup...</p>
        </CardBody>
      </Card>
    )
  }

  if (setupComplete) {
    return (
      <Card variant="glass" className="max-w-md mx-auto space-y-4">
        <CardBody className="text-center space-y-4">
          <Badge variant="success" dot size="lg">2FA Enabled</Badge>
          <p className="text-gray-100 text-sm">Store your recovery codes in a safe place.</p>
          <div className="bg-gray-800 rounded-lg p-4 text-xs font-mono text-gray-300 text-left space-y-1">
            {data?.recovery_codes.map(code => (
              <div key={code}>{code}</div>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={handleCopyCodes}>
            {copied ? 'Copied!' : 'Copy codes'}
          </Button>
          <Button variant="primary" className="w-full" onClick={() => navigate('/settings')}>
            Done
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card variant="glass" className="max-w-md mx-auto space-y-4">
      <CardHeader>
        <h2 className="text-xl font-semibold text-white">Set up two-factor authentication</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {data?.qr_code && (
          <div className="flex justify-center bg-white rounded-lg p-4">
            <img src={data.qr_code} alt="QR code" className="w-48 h-48" />
          </div>
        )}

        {data?.secret && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Or enter this code manually:</p>
            <code className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-200 select-all">{data.secret}</code>
          </div>
        )}

        <Input
          label="Authentication code"
          placeholder="Enter 6-digit code"
          maxLength={6}
          inputMode="numeric"
          value={token}
          onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
        />

        <Button
          variant="primary"
          loading={verifying}
          disabled={token.length !== 6}
          className="w-full"
          onClick={handleVerify}
        >
          {verifying ? 'Verifying\u2026' : 'Verify'}
        </Button>
      </CardBody>
    </Card>
  )
}
