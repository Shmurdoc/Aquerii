import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { Button, Input, Card, CardHeader, CardBody } from '@/components/ui'

export default function TwoFactorChallenge() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [useBackup])

  const handleSubmit = useCallback(async (token: string) => {
    if (token.length !== 6 && !useBackup) return
    if (useBackup && token.length < 8) return
    setLoading(true)
    try {
      const res = await api.post('/auth/2fa/challenge', {
        code: token,
        backup: useBackup,
      })
      const { user, token: authToken, workspace } = res.data.data
      setAuth(authToken, user, workspace)
      navigate('/boards')
    } catch {
      toast.error('Invalid code. Try again.')
    } finally {
      setLoading(false)
    }
  }, [useBackup, navigate, setAuth])

  useEffect(() => {
    if (!useBackup && code.length === 6 && !loading) {
      handleSubmit(code)
    }
  }, [code, useBackup, loading, handleSubmit])

  return (
    <Card variant="glass" className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-xl font-semibold text-white">Two-factor authentication</h2>
        <p className="text-sm text-gray-400 mt-1">
          {useBackup ? 'Enter a recovery code' : 'Enter the code from your authenticator app'}
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input
          ref={inputRef}
          label={useBackup ? 'Recovery code' : 'Authentication code'}
          placeholder={useBackup ? 'Enter recovery code' : '000000'}
          maxLength={useBackup ? 32 : 6}
          inputMode={useBackup ? 'text' : 'numeric'}
          value={code}
          onChange={e => setCode(useBackup ? e.target.value : e.target.value.replace(/\D/g, ''))}
        />

        <Button
          variant="primary"
          loading={loading}
          disabled={useBackup ? code.length < 8 : code.length !== 6}
          className="w-full"
          onClick={() => handleSubmit(code)}
        >
          {loading ? 'Verifying\u2026' : 'Verify'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => { setUseBackup(p => !p); setCode('') }}
        >
          {useBackup ? 'Use authenticator code instead' : 'Use a recovery code instead'}
        </Button>
      </CardBody>
    </Card>
  )
}
