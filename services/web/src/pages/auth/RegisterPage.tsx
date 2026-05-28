import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

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

function passwordStrength(pw: string): string {
  if (pw.length < 8) return ''
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) return 'Strong'
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 'Medium'
  return 'Weak'
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const password = watch('password')

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/register', data),
    onSuccess: (res) => {
      const { user, token, workspace } = res.data.data
      setAuth(token, user, workspace)
      navigate('/onboarding')
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

  const strength = passwordStrength(password ?? '')

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Create account</h2>

      {fields.map(f => (
        <Input
          key={f.name}
          label={f.label}
          type={f.type}
          autoComplete={f.autocomplete}
          error={errors[f.name]?.message}
          {...register(f.name)}
        />
      ))}

      {password && strength && (
        <p className={`text-xs ${strength === 'Strong' ? 'text-green-400' : strength === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
          Password strength: {strength}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? 'Creating account\u2026' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
