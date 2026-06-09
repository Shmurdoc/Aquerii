import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

const schema = z.object({
  password: z.string().min(12, 'Minimum 12 characters'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/reset-password', {
        ...data,
        token: params.get('token'),
        email: params.get('email'),
      })
      toast.success('Password reset! Please log in.')
      navigate('/login')
    } catch {
      toast.error('Failed to reset password.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">Set new password</h2>

      <Input
        type="password"
        label="New password"
        placeholder="New password (min 12 chars)"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        type="password"
        label="Confirm password"
        placeholder="Confirm new password"
        error={errors.password_confirmation?.message}
        {...register('password_confirmation')}
      />

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Resetting\u2026' : 'Reset password'}
      </Button>
    </form>
  )
}
