import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  name:           z.string().min(1, 'Name is required').max(255),
  email:          z.string().email('Invalid email'),
  password:       z.string().min(8, 'Minimum 8 characters'),
  password_confirmation: z.string(),
  workspace_name: z.string().min(1, 'Workspace name is required').max(255),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/register', data),
    onSuccess: (res) => {
      const { user, token, workspace } = res.data.data
      setAuth(token, user, workspace)
      navigate('/boards')
    },
    onError: (err: any) => {
      const errors = err.response?.data?.error?.errors
      if (errors) {
        toast.error(Object.values(errors).flat().join(' '))
      } else {
        toast.error(err.response?.data?.error?.message ?? 'Registration failed.')
      }
    },
  })

  const fields: Array<{ name: keyof FormData; label: string; type: string; autocomplete: string }> = [
    { name: 'name',           label: 'Full name',       type: 'text',     autocomplete: 'name' },
    { name: 'email',          label: 'Email',           type: 'email',    autocomplete: 'email' },
    { name: 'workspace_name', label: 'Workspace name',  type: 'text',     autocomplete: 'organization' },
    { name: 'password',       label: 'Password',        type: 'password', autocomplete: 'new-password' },
    { name: 'password_confirmation', label: 'Confirm password', type: 'password', autocomplete: 'new-password' },
  ]

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Create account</h2>

      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
          <input
            {...register(f.name)}
            type={f.type}
            autoComplete={f.autocomplete}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors[f.name] && <p className="text-red-400 text-xs mt-1">{errors[f.name]?.message}</p>}
        </div>
      ))}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
