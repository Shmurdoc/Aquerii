import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { Button, Input, Checkbox } from '@/components/ui'

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
      const { user, token, workspace, mfa_required } = res.data.data
      if (mfa_required) return
      setAuth(token, user, workspace)
      navigate('/boards')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message ?? 'Login failed.')
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Sign in</h2>

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Checkbox label="Remember me" />

      {mutation.data?.data?.data?.mfa_required && (
        <Input
          label="MFA Code"
          maxLength={6}
          inputMode="numeric"
          {...register('mfa_code')}
        />
      )}

      <Button
        type="submit"
        variant="primary"
        loading={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? 'Signing in\u2026' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <Link to="/register" className="text-indigo-400 hover:underline">Create one</Link>
      </p>
    </form>
  )
}
