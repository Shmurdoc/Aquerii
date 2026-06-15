import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  mfa_code: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate    = useNavigate()
  const setAuth     = useAuthStore(s => s.setAuth)
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/login', data),
    onSuccess: (res) => {
      const { user, token, workspace, role, mfa_required } = res.data.data
      if (mfa_required) return
      setAuth(token, user, workspace, role)
      navigate('/boards')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Login failed.')
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4" style={{ background: 'var(--color-bg-deepest)' }}>
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
      <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full opacity-[0.12] blur-3xl animate-orb-drift" style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 -right-24 w-80 h-80 rounded-full opacity-[0.10] blur-3xl animate-orb-drift-slow" style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-[0.06] blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <div className="rounded-2xl border p-6 backdrop-blur-xl" style={{
          background: 'var(--color-glass-bg-strong)',
          borderColor: 'var(--color-glass-border)',
        }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'var(--gradient-accent)',
              boxShadow: '0 0 20px var(--color-accent-glow)',
            }}>
              <LogIn size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Welcome back</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Sign in to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150"
                style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-light)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-glass-border)'; e.target.style.boxShadow = 'none' }}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--color-status-blocked)' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150"
                style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-light)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-glass-border)'; e.target.style.boxShadow = 'none' }}
              />
              {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--color-status-blocked)' }}>{errors.password.message}</p>}
            </div>

            {mutation.data?.data?.data?.mfa_required && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>MFA Code</label>
                <input
                  {...register('mfa_code')}
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150 tracking-widest text-center"
                  style={{
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-glass-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-light)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-glass-border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 press-shrink"
              style={{
                background: 'var(--gradient-accent)',
                opacity: mutation.isPending ? 0.6 : 1,
                boxShadow: '0 4px 16px var(--color-accent-glow)',
              }}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between pt-1">
              <Link
                to="/forgot-password"
                className="text-xs transition-colors duration-150 hover:underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Forgot password?
              </Link>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No account?{' '}
                <Link to="/register" className="font-medium transition-colors duration-150 hover:underline" style={{ color: 'var(--color-accent-text)' }}>
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
