import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

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
      if (mfa_required) return // form will reveal MFA field
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

      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="current-password"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
      </div>

      {mutation.data?.data?.data?.mfa_required && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">MFA Code</label>
          <input
            {...register('mfa_code')}
            type="text"
            maxLength={6}
            inputMode="numeric"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {mutation.isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <Link to="/register" className="text-indigo-400 hover:underline">Create one</Link>
      </p>
    </form>
  )
}
