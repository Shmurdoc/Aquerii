import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

interface FormData { email: string }

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email.')
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-100 text-sm">Check your email for a password reset link.</p>
        <Link to="/login" className="text-indigo-400 text-sm hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">Reset password</h2>

      <Input
        type="email"
        placeholder="Email address"
        error={errors.email?.message}
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        {...register('email', { required: 'Email is required' })}
      />

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Sending\u2026' : 'Send reset link'}
      </Button>

      <Link to="/login" className="block text-center text-gray-500 text-sm hover:text-gray-300">
        Back to login
      </Link>
    </form>
  )
}
