import { useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface FormData { password: string; password_confirmation: string }

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>()

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
      <input
        {...register('password', { required: true, minLength: 12 })}
        type="password"
        placeholder="New password (min 12 chars)"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
      />
      <input
        {...register('password_confirmation', { required: true })}
        type="password"
        placeholder="Confirm new password"
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  )
}
