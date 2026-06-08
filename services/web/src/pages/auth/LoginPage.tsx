import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, KeyRound, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { staggerStyle } from '@/lib/motion'
import toast from 'react-hot-toast'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  mfa_code: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate    = useNavigate()
  const setAuth     = useAuthStore(s => s.setAuth)
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/login', data),
    onSuccess: (res) => {
      const { user, token, workspace, role, mfa_required, mfa_token } = res.data.data
      if (mfa_required) {
        setMfaToken(mfa_token)
        return
      }
      setAuth(token, user, workspace, role)
      navigate('/boards')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Login failed.')
    },
  })

  const verifyMfaMutation = useMutation({
    mutationFn: (data: { mfa_token: string; code: string }) =>
      api.post('/auth/mfa/verify-token', data),
    onSuccess: (res) => {
      const { user, token, workspace, role } = res.data.data
      setAuth(token, user, workspace, role)
      navigate('/boards')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Invalid MFA code.')
    },
  })

  const mfaRequired = !!mfaToken

  const onSubmit = (data: FormData) => {
    if (mfaToken && data.mfa_code) {
      verifyMfaMutation.mutate({ mfa_token: mfaToken, code: data.mfa_code })
    } else {
      loginMutation.mutate(data)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
    >
      <div style={staggerStyle(0)} className="stagger-item">
        <h2 className="text-heading font-semibold text-[var(--color-text-primary)]">Sign in</h2>
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
          Welcome back. Enter your details to continue.
        </p>
      </div>

      <div style={staggerStyle(1)} className="stagger-item">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          icon={Mail}
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div style={staggerStyle(2)} className="stagger-item">
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          icon={Lock}
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end mt-1.5">
          <Link
            to="/forgot-password"
            className="text-label text-[var(--color-text-secondary)] hover:text-[var(--color-accent-text)] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {mfaRequired && (
        <div style={staggerStyle(3)} className="stagger-item">
          <Input
            label="MFA Code"
            type="text"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            icon={KeyRound}
            placeholder="6-digit code"
            error={errors.mfa_code?.message}
            {...register('mfa_code', { required: 'MFA code is required' })}
          />
        </div>
      )}

      <div style={staggerStyle(mfaRequired ? 4 : 3)} className="stagger-item pt-1">
        <Button
          type="submit"
          variant="gradient"
          size="md"
          fullWidth
          loading={loginMutation.isPending || verifyMfaMutation.isPending}
          className="group/btn"
        >
          <span>{loginMutation.isPending ? 'Signing in…' : verifyMfaMutation.isPending ? 'Verifying…' : 'Sign in'}</span>
          {!loginMutation.isPending && !verifyMfaMutation.isPending && (
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover/btn:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>

      <p
        style={staggerStyle(mfaRequired ? 5 : 4)}
        className="stagger-item text-center text-body-sm text-[var(--color-text-secondary)] pt-1"
      >
        No account?{' '}
        <Link
          to="/register"
          className="text-[var(--color-accent-text)] hover:text-[var(--color-accent)] font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </form>
  )
}
